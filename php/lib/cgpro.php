<?php
// $Id$

// Interface with CommuniGate server


////////////////////////////////////////////////////
//    User helpers
//


function cgp_user_reader (&$obj, $srv, $id) {

    $mail = cgp_verify_mail($id);
    if (empty($mail))
        return array('code' => -1, 'error' => _T('wrong mail "%s"', $id));

    // Read core account data
    $res = cgp_cmd($srv, 'GetAccountEffectiveSettings', $mail);
    if ($res['code']) {
        log_error('cannot read mail account of "%s": %s', $mail, $res['error']);
        return $res;
    }
    $ldap = $res['data'];

    // Remove values not belonging to us
    $cfg =& get_server($srv);
    $our_attrs = $cfg['attrlist'][$obj['type']];
    $others = array();
    foreach ($ldap as $key => $val) {
        if (array_search($key, $our_attrs) === false) {
            $others[$key] = $ldap[$key];
            unset($ldap[$key]);
        }
    }

    // Mark our private non-CGP fields with "_cgp_"
    $ldap['_cgp_id'] = get_attr($obj, 'uid');
    $ldap['_cgp_mail'] = $mail;
    $ldap['_cgp_others'] = $others;

    // Read account aliases
    $res = cgp_cmd($srv, 'GetAccountAliases', $mail);
    if ($res['code']) {
        log_error('cannot read mail aliases of "%s": %s', $mail, $res['error']);
        return $res;
    }
    $ldap['_cgp_mail_aliases'] = $res['data'];

    // Read domain mail rules
    $res = cgp_cmd($srv, 'GetDomainMailRules', get_config('mail_domain'));
    if ($res['code']) {
        log_error('cannot read mail domain rules of "%s": %s', $mail, $res['error']);
        return $res;
    }
    $ldap['_cgp_domain_rules'] = $res['data'];
    $ldap['_cgp_domain_rule_idx'] = -1;

    // Read server intercept
    $domain = get_config('mail_domain');
    $res = cgp_cmd($srv, 'GetServerIntercept', $domain);
    if ($res['code']) {
        log_error('cannot read mail server intercept of "%s": %s', $mail, $res['error']);
        return $res;
    }
    $ldap['_cgp_server_intercept'] = $res['data'];

    // Read mail groups
    $ldap['_cgp_mail_groups'] = array();
    $res = cgp_cmd($srv, 'ListGroups', $domain);
    if ($res['code']) {
        log_error('cannot list mail groups of "%s": %s', $mail, $res['error']);
        return $res;
    }
    $mgroups = $res['data'];
    foreach ($mgroups as $mgroup) {
        $res = cgp_cmd($srv, 'GetGroup', $mgroup.'@'.$domain);
        if ($res['code']) {
            log_error('error reading mail group "%s" for "%s": %s', $mgroup, $mail, $res['error']);
            continue;
        }
        $ldap['_cgp_mail_groups'][$mgroup] = $res['data'];
    }

    return array('code' => 0, 'error' => '', 'data' => array($ldap));
}


function cgp_user_writer (&$obj, $srv, $id, $idold, &$ldap) {
    $mail = cgp_verify_mail($id);
    if (empty($mail))
        return array('code' => -1, 'error' => _T('wrong target mail "%s"', $id));

    // rename user if needed
    if (!empty($idold) && $id != $idold) {
        $mail_old = cgp_verify_mail($idold);
        if (empty($mail_old))
            return array('code' => -1, 'error' => _T('wrong source mail "%s"', $idold));
        $res = cgp_cmd($srv, 'RenameAccount', $mail_old, $mail);
        if ($res['code']) {
            $res['error'] = _T('Cannot rename mail account "%s" to "%s": %s',
                                $idold, $id, $res['error']);
            return $res;
        }
        $obj['renamed'] = true;
    }

    // skip private pseudo-attributes and attributes not belonging to us
    $params = array();
    $cfg =& get_server($srv);
    $our_attrs = $cfg['attrlist'][$obj['type']];
    foreach ($ldap as $key => $val) {
        // skip private pseudo-attributes
        if (preg_match('/^_cgp_/', $key))  continue;
        // skip non-relevant attributes
        if (array_search($key, $our_attrs) === false)  continue;
        // passwords are handled separately
        if (strtolower($key) == 'password')  continue;
        // handle all others
        $params[$key] = $val;
    }

    if (empty($idold)) {
        $res = cgp_cmd($srv, 'CreateAccount',
                        array('accountName' => $mail, 'settings' => $params));
    } else {
        $res = cgp_cmd($srv, 'UpdateAccountSettings', $mail, $params);
    }
    if ($res['code']) {
        $res['error'] = _T('Cannot %s mail account "%s": %s',
                            (empty($idold) ? "create" : "update"), $id, $res['error']);
        return $res;
    }

    return array('code' => 0, 'error' => '');
}


function cgp_read_domain_intercept (&$obj, &$at, $srv, &$ldap, $name) {
    $rule_idx = -1;
    foreach ($ldap['_cgp_domain_rules'] as $idx => &$rule) {
        if (is_array($rule) || count($rule) >= 4) {
            list($prio, $name, $cond, $steps) = $rule;
            if (strpos($name, '#Redirect') !== false && is_array($steps)) {
                foreach ($steps as $step) {
                    if (is_array($step) && count($step) == 2) {
                        if (trim($step[0]) === 'Mirror to'
                                && trim($step[1] == get_config('cgp_listener'))) {
                            $rule_idx = $idx;
                            break;
                        }
                    }
                }
            }
        }
    }

    $ldap['_cgp_domain_rule_idx'] = $rule_idx;
    $val = bool2str($rule_idx >= 0);
    log_debug('cgp_read_domain_intercept: %s (idx=%s)', $val, $rule_idx);
    return $val;
}


function cgp_write_domain_intercept_final (&$obj, &$at, $srv, &$ldap, $name, $val) {
    $old = ($ldap['_cgp_domain_rule_idx'] >= 0);
    $val = str2bool($val);
    if ($val === $old)  return false;

    $rules &= $ldap['_cgp_domain_rules'];
    $rule_idx &= $ldap['_cgp_domain_rule_idx'];
    if ($val) {
        $rules[] = array(
                0,
                '#Redirect',
                array( array('Human Generated', '---') ),
                array( array('Mirror to', get_config('cgp_listener') ) )
            );
        $rule_idx = count($rules) - 1;
    } else {
        array_splice($rules, $rule_idx, 1, null);
        $rule_idx = -1;
    }

    $res = cgp_cmd($srv, 'SetDomainMailRules', get_config('mail_domain'));
    if ($res['code']) {
        $obj['msg'][] = log_error('cgp_write_domain_intercept error: %s', $res['error']);
        return false;
    }

    return true;
}


function cgp_read_user_intercept (&$obj, &$at, $srv, &$ldap, $name) {
    // Return true if at least one intercept option is turned on
    $mail = $ldap['_cgp_mail'];
    $intercept = $ldap['_cgp_server_intercept'];
    if (!isset($intercept[$mail]))
        return bool2str(false);
    foreach ($intercept[$mail] as $opt) {
        if (strtolower($opt) == 'yes')
            return bool2str(true);
    }
    return bool2str(false);
}


function cgp_write_user_intercept_final (&$obj, &$at, $srv, &$ldap, $name, $val) {
    $old = cgp_read_domain_intercept ($obj, $at, $srv, $ldap, $name);
    if (is_null($old))  return false;
    $old = str2bool($old);
    $val = str2bool($val);
    if ($val === $old)  return false;

    $mail = $ldap['_cgp_mail'];
    $intercept =& $ldap['_cgp_server_intercept'];

    if ($val) {
        // add to the intercept structures
		$intercept[$mail] = array('SendTo' => get_config('cgp_listener'));
		foreach (split_list(get_config('cgp_intercept_opts')) as $opt)
		    $intercept[$mail][$opt] = 'YES';
    } else {
        #unset($intercept[$mail]);
		$intercept[$mail] = array();
		foreach (split_list(get_config('cgp_intercept_opts')) as $opt)
		    $intercept[$mail][$opt] = 'NO';
    }

    $res = cgp_cmd($srv, 'SetServerIntercept', $intercept);
    if ($res['code']) {
        log_error('cgp_write_user_intercept error: %s', $res['error']);
        return false;
    }

    return true;
}


function cgp_read_aliases (&$obj, &$at, $srv, &$ldap, $name) {
    $aliases = array();
    $telnum = '';
    $telnum_pat = get_telnum_pattern();
    foreach ($ldap['_cgp_mail_aliases'] as $alias) {
        if (preg_match($telnum_pat, $alias))
            $telnum = $alias;
        else
            $aliases[] = $alias;
    }
    $aliases = join_list($aliases);
    log_debug('read aliases: telnum="%s" aliases="%s"', $telnum, $aliases);
    if (! empty($telnum))
        set_attr($obj, 'telnum', $telnum);  // side-effect value
    return $aliases;
}


function cgp_write_aliases_final (&$obj, &$at, $srv, &$ldap, $name, $val) {
return false;#FIXME
    $mail = $ldap['_cgp_mail'];
    $aliases = split_list($val);
    $telnum = get_attr($obj, 'telnum');
    $aliases[] = $telnum;
    $aliases = array_unique($aliases);
    $res = cgp_cmd($srv, 'SetAccountAliases', $mail, $aliases);
    log_debug('write_aliases_final(%s)=(%s): %s', $mail, $val, $res['error']);
    return ($res['code'] == 0);
}


function cgp_read_mail_groups (&$obj, &$at, $srv, &$ldap, $name) {
    $mail = $ldap['_cgp_mail'];
    $domain = get_config('mail_domain');
    $mgroups = array();
    $uid = preg_replace('/\@.*$/', '', $mail);
    foreach ($ldap['_cgp_mail_groups'] as $mgroup => $desc) {
        if (!empty($desc['Members'])) {
            if (array_search($uid, $desc['Members']) !== FALSE)
                $mgroups[] = $mgroup;
        }
    }
    return join_list($mgroups);
}


function cgp_write_mail_groups_final (&$obj, &$at, $srv, &$ldap, $name, $val) {
return false;#FIXME
    $mail = $ldap['_cgp_mail'];
    $old = cgp_read_mail_groups($obj, $at, $srv, $ldap, $name);
    if (is_null($old))
        return false;

    $mgroups = split_list($val);
    $val = join_list($mgroups);
    if ($val === $old)
        return false;

    $uid = preg_replace('/\@.*$/', '', $mail);
    $domain = get_config('mail_domain');

    foreach ($ldap['_cgp_mail_groups'] as $mgroup => &$desc) {
        if (empty($desc['Members']))
            $desc['Members'] = array();
        $in_old = (array_search($uid, $desc['Members']) !== FALSE);
        $in_new = (array_search($uid, $mgroups) !== FALSE);
        if ($in_old === $in_new)
            continue;
        if (!$in_old && $in_new)
            $desc['Members'][] = $uid;
        if ($in_old && !$in_new)
            array_splice($desc['Members'], array_search($uid, $desc['Members']), 1, null);
        $res = cgp_cmd($srv, 'GetGroup', $mgroup.'@'.$domain);
        if ($res['code'])
            log_error('error setting mail group "%s": %s', $mgroup, $res['error']);
    }

    log_debug('write_aliases_final(%s)=(%s)', $mail, $val);
    return true;
}


function cgp_write_pass_final (&$obj, &$at, $srv, &$ldap, $name, $val) {
    $mail = $ldap['_cgp_mail'];
    $enc = get_config('cgp_pass_encryption');
    if (empty($enc)) {
        $obj['msg'][] =
            log_error('cgp_pass_encryption: missing required configuration parameter');
        return false;
    }

    $res = cgp_cmd($srv, 'UpdateAccountSettings', $mail, array(
                    'UseAppPassword' => 'YES', 'PasswordEncryption' => $enc
                    ));
    if ($res['code']) {
        $obj['msg'][] =
            log_error('Cannot change mail password encryption for "%s" to "%s": %s',
                        $mail, $passenc, $res['error']);
        return false;
    }

    $cgpass = $val;
    if (preg_match('/^\{\w{2,5}\}\w+$/', $cgpass)
            && str2bool(get_config('show_password')))
        $cgpass = "\x2" . $cgpass;

    $res = cgp_cmd($srv, 'SetAccountPassword', $mail, $cgpass);
    if ($res['code']) {
        $obj['msg'][] =
            log_error('Cannot change mail password for "%s" on "%s": %s',
                        $mail, $srv, $res['error']);
        return false;
    }

    log_debug('changed mail password for "%s" on "%s"', $mail, $srv);
    return true;
}


////////////////////////////////////////////////////
//    Mailgroup helpers
//


function cgp_mailgroup_list ($srv) {
    $res = cgp_cmd($srv, 'ListGroups', get_config('mail_domain'));
    if ($res['code'])  return $res;
    $data = array();
    foreach ($res['data'] as $name)
        $data[] = array('uid' => $name);
    $res['data'] = $data;
    return $res;
}


function cgp_mailgroup_reader (&$obj, $srv, $id) {
    $res = cgp_cmd($srv, 'GetGroup', $id . '@' . get_config('mail_domain'));
    return cgp_fix_res($res);
}


function cgp_read_mailgroup_uid (&$obj, &$at, $srv, &$ldap, $name) {
    return $obj['id'];
}


function cgp_read_mailgroup_members (&$obj, &$at, $srv, &$ldap, $name) {
    return isset($ldap['Members']) ? join_list($ldap['Members']) : '';
}


function cgp_write_mailgroup_members (&$obj, &$at, $srv, &$ldap, $name, $val) {
    if ($val == cgp_read_mailgroup_members ($obj, $at, $srv, $ldap, $name))
        return false;
    $ldap['Members'] = split_list($val);
    return true;
}


function cgp_read_mailgroup_params (&$obj, &$at, $srv, &$ldap, $name) {
    $data = $ldap; // make a local copy
    unset($data['RealName']);
    unset($data['Members']);
    return empty($data) ? '' : cgp_pack($srv, $data);
}


function cgp_write_mailgroup_params (&$obj, &$at, $srv, &$ldap, $name, $val) {
    $old = cgp_read_mailgroup_params($obj, $at, $srv, $ldap, $name);
    if ($old == $val)
        return false;
    $res = cgp_unpack($srv, $val);
    if ($res['code'])  error_page($res['error']);
    $data = $res['data'];
    foreach ($data as $n => $v) {
        if ($n != 'RealName' && $n != 'Members')
            $ldap[$n] = $v;
    }
    return true;
}


function cgp_mailgroup_writer (&$obj, $srv, $id, $idold, &$ldap) {
    // rename the group if needed
    $domain = get_config('mail_domain');
    if (!empty($idold) && $id != $idold) {
        $res = cgp_cmd($srv, 'RenameGroup', $idold.'@'.$domain, $id.'@'.$domain);
        if ($res['code']) {
            $res['error'] = _T('Cannot rename mail group "%s" to "%s": %s',
                                $idold, $id, $res['error']);
            return $res;
        }
        $obj['renamed'] = true;
    }

    $cmd = empty($idold) ? 'CreateGroup' : 'SetGroup';
    $res = cgp_cmd($srv, $cmd, $id.'@'.$domain, $ldap);
    if ($res['code']) {
        $res['error'] = _T('Cannot %s mail group "%s": %s',
                            (empty($idold) ? "create" : "update"), $id, $res['error']);
        return $res;
    }

    return array('code' => 0, 'error' => '');
}


////////////////////////////////////////////////////
//    CLI interface
//

function cgp_connect ($srv) {
    $cfg =& get_server($srv);
    $uri = $cfg['uri'];
    if (! preg_match('!^\s*(?:\w+\://)?([\w\.\-]+)(?:\s*\:\s*(\d+))[\s/]*$!', $uri, $parts)) {
        log_error('invalid uri for server CLI');
        return -1;
    }
    $cfg['host'] = empty($parts[1]) ? 'localhost' : $parts[1];
    $cfg['port'] = empty($parts[2]) ? 106 : $parts[2];
    $creds = get_credentials($srv);
    $cfg['user'] = $creds['user'];
    $cfg['pass'] = $creds['pass'];
    $cfg['connected'] = false;
    $cfg['failed'] = true;
    $cfg['cli'] = new CLI;
    $cli =& $cfg['cli'];
    if ($cfg['debug'])
        $cli->SetDebug(2);
    if (! $cli->Login($cfg['host'], $cfg['port'], $cfg['user'], $cfg['pass'])) {
        log_error('cannot bind to CLI: ' . $cli->getErrMessage());
        return -1;
    }
    log_debug('connected to cgp cli');
    $cfg['connected'] = true;
    $cfg['failed'] = false;
    return 0;
}


function cgp_disconnect ($srv) {
    $cfg =& get_server($srv);
    if (!$cfg['connected'])
        return;
    if (isset($cfg['cli'])) {
        $cfg['cli']->Logout();
        unset($cfg['cli']);
    }
    $cfg['connected'] = $cfg['failed'] = false;
}


function _cgp_cli ($srv) {
    $cfg =& get_server($srv, true);
    uldap_connect($srv);
    if (!$cfg['connected'] || !isset($cfg['cli'])) {
        $msg = $cfg['disable'] ? 'CGP disabled' :
                (isset($cfg['cli']) ? 'CGP not connected' : 'CGP is not CLI');
        set_error($msg);
        return null;
    }
    return $cfg['cli'];
}


// cgp_cmd($srv_name, $func_name, $func_args...)
function cgp_cmd () {
    $args = func_get_args();
    $srv = array_shift($args);
    $func = array_shift($args);

    $cli = _cgp_cli($srv);
    if (is_null($cli))
        return array('code' => -1, 'error' => $msg, 'data' => array());

    $ret = call_user_func_array(array($cli, $func), $args);
    if ($cli->isSuccess()) {
        set_error();
        return array('code' => 0, 'error' => '', 'data' => $ret);
    }

    log_error("cgp($func) error: " . $cli->getErrMessage());
    return array('code' => $cli->getErrCode(), 'error' => $cli->getErrMessage(), 'data' => array());
}


function cgp_pack ($srv, $data) {
    $cli = _cgp_cli($srv);
    if (is_null($cli)) {
        log_error('cgp_pack(%s): invalid CGP state', $srv);
        return '';
    }
    return $cli->printWords($data);
}


function cgp_unpack ($srv, $string) {
    $cli = _cgp_cli($srv);
    $res = array('data' => null, 'code' => -1, 'error' => '');
    if (is_null($cli))
        $res['error'] = "cgp_unpack: server disconnected";
    else {
        $data = $cli->parseUserWords($string, $msg);
        if (! empty($msg))
            $res['error'] = $msg;
        else if (! is_array($data))
            $res['error'] = "Mail settings should be an array";
        else {
            $res['code'] = 0;
            $res['data'] = $data;
        }
    }
    return $res;
}


////////////////////////////////////////////////////
//    Utilities
//

function get_telnum_pattern () {
    return '/^\d{'.get_config('telnum_len',3).'}$/';
}


function get_email (&$obj) {
    return nvl(get_attr($obj, 'mail'));
}


//
// Wrap successful result into array to mimic LDAP
//
function cgp_fix_res (&$res) {
    if (!$res['code'])
        $res['data'] = array($res['data']);
    return $res;
}


//
// Verify that account belongs to our mail domain
//
function cgp_verify_mail ($mail) {
    if (empty($mail))
        return $mail;
    $domain = get_config('mail_domain');
    $pos = strpos($mail, '@');
    if ($pos === false)     // domain not included, just add it
        return $mail . '@' . $domain;
    if (substr($mail, $pos+1) != $domain)
        return null;        // wrong domain included, flag error
    return $mail;
}


?>

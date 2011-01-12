<?php
// $Id$

// Retrieve group object

require '../lib/common.php';

send_headers();
$id = req_param('cn');
if (empty($id))  error_page("cn: required parameter wrong or not specified");

$grp = create_obj('group');
set_attr($grp, 'cn', $id);
$msg = obj_read($grp, 'uni', "(&(objectClass=posixGroup)(cn=\${cn}))");
echo($msg ? json_error($msg) : obj_json_encode($grp));

srv_disconnect_all();
?>

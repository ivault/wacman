<?php
// $Id$

// Return list of users from LDAP

require '../lib/common.php';

uldap_connect_all();
send_json_headers();
echo uldap_json_encode(uldap_search('uni', "(objectClass=person)", array('uid', 'cn')));
uldap_disconnect_all();
?>
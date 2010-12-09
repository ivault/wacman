// $Id$

function test_msg(e) {
    Ext.Msg.alert('hihi','hohoho');
}

// users

var user_obj = { changed: false };

function user_add() {
    test_msg();
}

function user_delete() {
    test_msg();
}

function users_refresh() {
    test_msg();
}

function user_unselect() {
}

function user_change(user_sm) {
    Ext.Msg.alert('hihi','user change');
}

function user_load(user_sm, row_idx, rec) {
    Ext.Msg.alert('hihi','user load');
}

function create_user_list() {
    var user_test_data = new Array(20);
    for (i = 0; i < user_test_data.length; i++) {
        user_test_data[i] = [ 'u'+(i+10), 'User #'+(i+10) ];
    }
    var user_rec = Ext.data.Record.create([
        'username',
        'fullname'
    ]);
    var user_store = new Ext.data.Store({
        data: user_test_data,
        reader: new Ext.data.ArrayReader({idIndex: 0}, user_rec)
    });
    return {
        xtype: 'grid',
        store: user_store,
        colModel: new Ext.grid.ColumnModel({
            columns: [{
                header: _T('Identifier'),
                dataIndex: 'username',
                sortable: true,
                width: 100,
            },{
                header: _T('Full name'),
                dataIndex: 'fullname',
                sortable: true,
                width: 190
            }]
        }),
        selModel: new Ext.grid.RowSelectionModel({
            singleSelect: true,
            listeners: {
                rowdeselect: user_change, // FIXME
                rowselect: user_load
            }
        })
    };
}

function create_user_desc() {
    return {
        html: 'user desc'
    };
}

// groups

var group_obj = { changed: false };

function group_add() {
    test_msg();
}

function group_delete() {
    test_msg();
}

function groups_refresh() {
    test_msg();
}

function group_unselect() {
}

function group_change(user_sm) {
    Ext.Msg.alert('hihi','group change');
}

function group_load(user_sm, row_idx, rec) {
    Ext.Msg.alert('hihi','group load');
}

function create_group_list() {
    var group_test_data = new Array(20);
    for (i = 0; i < group_test_data.length; i++) {
        group_test_data[i] = [ 'grp'+(i+10) ];
    }
    var group_rec = Ext.data.Record.create([
        'group'
    ]);
    var group_store = new Ext.data.Store({
        data: group_test_data,
        reader: new Ext.data.ArrayReader({idIndex: 0}, group_rec)
    });
    return {
        xtype: 'grid',
        store: group_store,
        colModel: new Ext.grid.ColumnModel({
            columns: [{
                header: _T('Group name'),
                dataIndex: 'group',
                sortable: true,
                width: 120
            }]
        }),
        selModel: new Ext.grid.RowSelectionModel({
            singleSelect: true,
            listeners: {
                rowdeselect: group_change, // FIXME
                rowselect: group_load
            }
        })
    };
}

function create_group_desc() {
    return {
        html: 'group desc'
    };
}

// mailgroups

function mailgroup_add() {
    test_msg();
}

function mailgroup_delete() {
    test_msg();
}

function mailgroups_refresh() {
    test_msg();
}

function mailgroup_unselect() {
}

function mailgroup_change(user_sm) {
    Ext.Msg.alert('hihi','mailgroup change');
}

function mailgroup_load(user_sm, row_idx, rec) {
    Ext.Msg.alert('hihi','group load');
}

function create_mailgroup_list() {
    var mailgroup_test_data = new Array(20);
    for (i = 0; i < mailgroup_test_data.length; i++) {
        mailgroup_test_data[i] = [ 'grp'+(i+10) ];
    }
    var mailgroup_rec = Ext.data.Record.create([
        'mailgroup'
    ]);
    var mailgroup_store = new Ext.data.Store({
        data: mailgroup_test_data,
        reader: new Ext.data.ArrayReader({idIndex: 0}, mailgroup_rec)
    });
    return {
        xtype: 'grid',
        store: mailgroup_store,
        colModel: new Ext.grid.ColumnModel({
            columns: [{
                header: _T('Mail group name'),
                dataIndex: 'mailgroup',
                sortable: true,
                width: 140
            }]
        }),
        selModel: new Ext.grid.RowSelectionModel({
            singleSelect: true,
            listeners: {
                rowdeselect: mailgroup_change, // FIXME
                rowselect: mailgroup_load
            }
        })
    };
}

function create_mailgroup_desc() {
    return {
        html: 'mailgroup desc'
    };
}

// main

function gui_exit() {
	if (user_obj.changed || group_obj.changed) {
		//my $resp = message_box('question', 'yes-no', _T('Exit and loose changes ?'));
		//return 1 if $resp ne 'yes';
		user_obj.changed = group_obj.changed = false;
	}
	user_unselect();
	group_unselect();
	mailgroup_unselect();
    Ext.Msg.alert('exit','Exit');
}

function west_region(w,width) {
    w.region = 'west';
    w.split = true;
    w.collapsible = true;
    w.collapseMode = 'mini';
    w.width = width;
    w.minSize = 50;
    return w;
}

function center_region(w) {
    w.region = 'center';
    return w;
}

function main() {
    Ext.get('no-js').hide();
    var tb_icon = {
        xtype: 'box',
        autoEl: {
            tag: 'img',
            src: 'images/userman_32x32.png'
        }
    };
    var users_tab = {
        title: _T(' Users '),
        layout: 'border',
        items: [
            west_region(create_user_list(), 300),
            center_region(create_user_desc())
        ],
        bbar: {
            xtype: 'toolbar',
            items: [
            tb_icon,' ',
            {
		        text: _T('Create'),
		        icon: 'images/add.png',
		        handler: user_add,
		        id: 'btn_usr_add'
		    },{
		        text: _T('Delete'),
		        icon: 'images/delete.png',
		        handler: user_delete,
		        id: 'btn_usr_delete'
		    },{
		        text: _T('Refresh'),
		        icon: 'images/refresh.png',
		        handler: users_refresh,
		        id: 'btn_usr_refresh'
		    },'->',{
		        text: _T('Exit'),
		        icon: 'images/exit.png',
		        handler: gui_exit
		    }]
        }
    };
    var groups_tab = {
        title: _T(' Groups '),
        layout: 'border',
        items: [
            west_region(create_group_list(), 150),
            center_region(create_group_desc())
        ],
        bbar: {
            xtype: 'toolbar',
            items: [
            tb_icon,' ',
            {
		        text: _T('Create'),
		        icon: 'images/add.png',
		        handler: group_add,
		        id: 'btn_grp_add'
		    },{
		        text: _T('Delete'),
		        icon: 'images/delete.png',
		        handler: group_delete,
		        id: 'btn_grp_delete'
		    },{
		        text: _T('Refresh'),
		        icon: 'images/refresh.png',
		        handler: groups_refresh,
		        id: 'btn_grp_refresh'
		    },'->',{
		        text: _T('Exit'),
		        icon: 'images/exit.png',
		        handler: gui_exit
		    }]
        }
    };
    var mailgroups_tab = {
        title: _T(' Mail groups '),
        layout: 'border',
        items: [
            west_region(create_mailgroup_list(), 150),
            center_region(create_mailgroup_desc())
        ],
        bbar: {
            xtype: 'toolbar',
            items: [
            tb_icon,' ',
            {
		        text: _T('Create'),
		        icon: 'images/add.png',
		        handler: mailgroup_add,
		        id: 'btn_mgrp_add'
		    },{
		        text: _T('Delete'),
		        icon: 'images/delete.png',
		        handler: mailgroup_delete,
		        id: 'btn_mgrp_delete'
		    },{
		        text: _T('Refresh'),
		        icon: 'images/refresh.png',
		        handler: mailgroups_refresh,
		        id: 'btn_mgrp_refresh'
		    },'->',{
		        text: _T('Exit'),
		        icon: 'images/exit.png',
		        handler: gui_exit
		    }]
        }
    };

    new Ext.Viewport({
        defaults: {
            bodyStyle: 'padding: 5px;',
        },
        layout: 'border',
        items: [{
            region: 'north',
            margins: '5 5 5 5',
            xtype: 'label',
            text: _T('Manage Users'),
            style: 'font-weight: bold; text-align: center'
        } , {
            region: 'center',
            margins: '0 0 0 0',
            xtype: 'tabpanel',
            activeTab: 0,
            items: [ users_tab, groups_tab, mailgroups_tab ]
        }]
    });

	user_unselect();
	group_unselect();
	mailgroup_unselect();
};

Ext.onReady(main);

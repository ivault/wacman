// $Id$

//
// Userman namespace
//
Ext.ns("Userman");

/////////////////////////////////////////////////////////
// Global constants
//

Userman.MAX_ID_LEN = 16;
Userman.THROBBER_ACTIVE = "images/throbber-24.gif";
Userman.THROBBER_IDLE = "images/userman-32.png";
Userman.RIGHT_GAP = 20;
Userman.COL_GAP = 2;
Userman.LABEL_WIDTH = 150;
Userman.TAB_PADDING = "10px";
Userman.FORM_TIMEOUT = 15;
Userman.VIEWPORT_PADDING = "5px";

//
// Global variables
//

Userman.translations = [];
Userman.config = {};
Userman.all_attrs = {};
Userman.gui_attrs = {};

//
// Translates and formats a string
//
Userman.T = function (msg /*, ... */) {
    var msg = arguments[0];
    msg = Userman.translations[msg] || msg;
    for (var i = 1; i < arguments.length; i++)
        msg = msg.replace("%s", arguments[i]);
    return msg;
};

//
// Formats, translates and prints a debugging message
//
Userman.debug = function (msg /*, ...*/) {
    if (Userman.toBool(Userman.getConfig("debug"))) {
        var msg = Userman.T.apply(Userman, arguments);
        if (typeof console !== "undefined" && console)
            console.log(msg);
    }
}

//
// Returns value of a configuration parameter
//
Userman.getConfig = function (name) {
    return (name in Userman.config ? Userman.config[name] : null);
}

/////////////////////////////////////////////////////////
// String utilities
//

//
// Remove blanks at front and end of the string
//
Userman.trim = function (s) {
    s = (s == undefined ? "" : "" + s);
    return s.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
}

//
// Strings "yes", "true", "on" or "1" (case insensitive)
// are true, all others are false.
//
Userman.toBool = function (s) {
    if (!s)
        return false;
    s = Userman.trim(s);
    if (s.length < 1)
        return false;
    return ("yto1".indexOf(s.charAt(0).toLowerCase()) >= 0);
}

Userman.fromBool = function (v) {
    return (Userman.toBool(v) ? "Yes" : "No");
}

//
// Converts a string to identifier with non-latin letters substituted
// by latin equivalents, makes it lower case and removes all non
// alphanumeric letters replacing them by underscores.
//
Userman.toId = function (s) {
    // This conversion table performs simple conversion
    // from cyrillic unicode letters to latin
    if (! Userman._rus2lat) {
        var xlat = Userman._rus2lat = [];
        var rus_b = "\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041a"
                  + "\u041b\u041c\u041d\u041e\u041f\u0420\u0421\u0422\u0423\u0424\u0425"
                  + "\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f";
        var lat_b = "ABVGDEWZIJKLMNOPRSTUFHC4WWXYXEUQ";
        var rus_s = "\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043a"
                  + "\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445"
                  + "\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f";
        var lat_s = "abvgdewzijklmnoprstufhc4wwxyxeuq";
        var i;
        for (i = 0; i < 0x450 - 0x400; i++)
            xlat[i] = i;
        for (i = 0; i < rus_b.length; i++)
            xlat[rus_b.charCodeAt(i) - 0x400] = lat_b.charCodeAt(i);
        for (i = 0; i < rus_s.length; i++)
            xlat[rus_s.charCodeAt(i) - 0x400] = lat_s.charCodeAt(i);            
    }

    // The following table converts uppercase to lowercase latin
    // and leaves only latin and digits
    if (! Userman._char2id) {
        xlat = Userman._char2id = [];
        for (i = 0; i < 256; i++) {
            if (i >= "0".charCodeAt(0) && i <= "9".charCodeAt(0))
                xlat[i] = i;
            else if (i >= "a".charCodeAt(0) && i <= "z".charCodeAt(0))
                xlat[i] = i;
            else if (i >= "A".charCodeAt(0) && i <= "Z".charCodeAt(0))
                xlat[i] = i + "a".charCodeAt(0) - "A".charCodeAt(0);
            else
                xlat[i] = "_".charCodeAt(0);
        }
    }

    s = Userman.trim(s);
    var n = s.length;
    if (n > Userman.MAX_ID_LEN)
        n = Userman.MAX_ID_LEN;

    var r = "";
    for (var i = 0; i < n; i++) {
        var c = s.charCodeAt(i);
        c = (c >= 0x400 && c < 0x450) ? Userman._rus2lat[c - 0x400] : c;
        c = (c > 0 && c < 256) ? Userman._char2id[c] : "_";
        r += String.fromCharCode(c);
    }

    return r;
}

//
// Format internal telephone as left zero-padded 
//
Userman.formatTelnum = function (telnum) {
    telnum = Userman.trim(telnum).replace(/[^0-9]/g, "");
    var len = Userman.getConfig("telnum_len");
    if (telnum.length < len) {
        while (telnum.length < len)
            telnum = "0" + telnum;
        return telnum;
    }
    if (telnum.length > len)
        telnum = telnum.substr(telnum.length - len, len);
    return telnum;
}

/////////////////////////////////////////////////////////
// AJAX indicator icon
//

Userman.Throbber = Ext.extend(Ext.Button, {
    disabled: true,
    scale: "medium",
    ajax_urls : null,
    icon: Userman.THROBBER_IDLE,

    initComponent : function() {
        this.ajax_urls = [];
        Ext.Ajax.on("beforerequest", function(c,o) { this.addReq(c,o); }, this);
        Ext.Ajax.on("requestcomplete", function(c,r,o) { this.remReq(c,r,o); }, this);
        Ext.Ajax.on("requestexception", function(c,r,o) { this.remReq(c,r,o); }, this);
    },

    addReq: function (conn, o) {
        if (this.ajax_urls.indexOf(o.url) < 0) {
            this.ajax_urls.push(o.url);
            this.setIcon(Userman.THROBBER_ACTIVE);
        }
    },

    remReq: function (conn, resp, o) {
        this.ajax_urls.remove(o.url);
        if (this.ajax_urls.length <= 0)
            this.setIcon(Userman.THROBBER_IDLE);
    },
});

/////////////////////////////////////////////////////////
// Fix a bug in LovCombo.
// The value did not change after onblur because
// auto-inserted blanks don't pass regexp in setValue
//

Userman.MultiComboBox = Ext.extend(Ext.ux.form.LovCombo, {
    getCheckedDisplay:function() {
		return this.getCheckedValue(this.displayField);
	}
});

/////////////////////////////////////////////////////////
// Data object
//

Userman.Object = Ext.extend(Ext.util.Observable, {

    name: undefined,
    list: undefined,
    title: undefined,

    list_url: undefined,
    read_url: undefined,
    write_url: undefined,
    delete_url: undefined,

    obj_panel: null,
    list_panel: undefined,
    list_store: undefined,

    form_panel: undefined,
    form: undefined,

    obj_attrs: undefined,
    form_tabs: undefined,
    id_attr: undefined,
    id_value: undefined,

    Data: undefined,
    data: undefined,
    changed: false,

    attr: {},
    list_cols: [],
    list_width: 0,

    //
    // Object constructor
    //
    constructor : function(cfg) {

        Ext.apply(this, cfg);

        with (this) {
            attr = {};
            list_cols = [];
            list_width = Userman.COL_GAP + 1;
            list_store = Userman.std_lists[list].store;
            form_tabs = [];

            // setup AJAX URLs
            list_url = list_url || name + "-list.php";
            read_url = read_url || name + "-read.php";
            write_url = write_url || name + "-write.php";
            delete_url = delete_url || name + "-delete.php";
        }

        // setup visual attributes
        var form_attrs = Userman.gui_attrs[this.name] || [];
        for (var i = 0; i < form_attrs.length; i++) {
            var tab_name = form_attrs[i][0];
            var tab_attrs = form_attrs[i][1];
            var fields = [];

            for (var j = 0; j < tab_attrs.length; j++) {
                var at = this.setupField(tab_attrs[j]);
                if (at.field)
                    fields.push(at.field);
            }

            if (fields.length) {
                this.form_tabs.push({
                    title: Userman.T(tab_name),
                    layout: "form",
                    autoScroll: true,
                    //autoHeight: true,
                    bodyStyle: "padding: " + Userman.TAB_PADDING,
                    labelWidth: Userman.LABEL_WIDTH,
                    labelSeparator: "",
                    items: fields
                });
            }
        }

        // setup non-visual attributes
        for (var name in Userman.all_attrs[this.name]) {
            if (!(name in this.attr))
                this.setupField(name);
        }

        with (this) {
            obj_attrs = [];
            for (var name in Userman.all_attrs[name])
                obj_attrs.push(name);
            Data = Ext.data.Record.create(obj_attrs);
            data = new Data ();
        }
    },

    // Deselect the list.
    unselect: function () {
        // Activate first field in first tab
        // The form panel contains a single TabPanel item
        var tab_panel = this.form_panel.items.first();
        tab_panel.setActiveTab(0);
        tab_panel.getActiveTab().items.first().focus(false);

        this.form_panel.setTitle("...");
        if (this.list_panel.getSelectionModel().grid)
            this.list_panel.getSelectionModel().clearSelections(false);
        this.markChanged(false, true);
    },

    // Clear up the form and deselect the list.
    clear: function () {
        with (this) {
            id_value = null;
            for (var i = 0; i < obj_attrs.length; i++)
                vset(obj_attrs[i], '');
            form.loadRecord(data);
            unselect();
        }
    },

    // Ask user if he is sure and proceed to record deletion if yes
    onDelete: function () {
        if (! this.id_value)
            return;
        var _this = this;
        Ext.Msg.confirm(this.id_value,
                        Userman.T("Really delete?"),
                        function (reply) {
                            if (reply == "yes")  _this.doDelete();
                        });
    },

    // Delete current record
    doDelete: function() {
        var params = {};
        params[this.id_attr] = this.id_value;
        this.form.submit({
            clientValidation: false,
            url: this.delete_url,
            method: 'GET',
            params: params,
            success: function (form, action) {
                this.refresh();
            },
            failure: function (form, action) {
                var title = Userman.T('Delete failed');
                Ext.Msg.alert(title, Userman.T(action.response.statusText));
                this.clear();
            },
            scope: this
        });
    },

    // Rejects changes and refreshes lists.
    refresh: function () {
        this.clear();
        this.list_store.reload();
    },

    // Load form from server
    load: function (sm, row, rec) {
        // prepare the request id parameter
        var params = {};
        params[this.id_attr] = rec.get(this.id_attr);

        this.form.load({
            method: "GET",
            url: this.read_url,
            params: params,
            waitTitle: params[this.id_attr],
            waitMsg: Userman.T("Loading..."),
            scope: this,

            success: function (form, action) {
                this.data = new this.Data (action.result.data);
                this.id_value = params[this.id_attr];
                this.unselect();
            },

            failure: function (form, action) {
                this.clear();
                Ext.Msg.alert(Userman.T(action.failureType),
                                Userman.T(action.response.statusText));
            }
        });
    },

    // Submit form to server
    save: function () {
        this.form.submit();
        this.markChanged(false);
    },

    // Called when user clicks the "revert" button.
    // Asks user whether he is sure.
    onRevert: function () {
        if (!this.changed)
            return;
        var _this = this;
        Ext.Msg.confirm(this.vget(this.id_attr),
                        Userman.T("Really revert changes?"),
                        function (reply) {
                            if (reply == "yes")  _this.doRevert();
                        });
    },

    // Actually rejects the changes.
    doRevert: function () {
        if (this.id_value) {
            this.data.reject();
            this.form.loadRecord(this.data);
            this.markChanged(false);
        } else {
            this.clear();
        }
    },

    // This function is called after each key press
    // It will auto-fill some fields
    onModified: function (field, ev) {
        var val = Userman.trim(field.getValue());
        if (val == this.vget(field._attr.name))
            return;
        this.vset(field._attr.name, val);

        this.rework();
        this.fillDefs();
        this.form.loadRecord(this.data);
        this.markChanged(this.data.dirty);
        this.form_panel.setTitle(this.formTitle() + " ...");
    },

    // Return title of the form (usually the id field)s
    formTitle: function() {
        return "";
    },

    // Auto-fill some fields after key pressed
    rework: function () {
    },

    // Disable or enable form and list buttons depending on:
    //   * whether form is empty or loaded from server
    //   * form values are changed
    markChanged: function (changed, force) {
        if (changed == this.changed && !force)
            return;
        this.changed = changed;

        var ids1 = [ this.name + '_list', this.btnId('refresh') ];
        var ids0 = [ this.btnId('save'), this.btnId('revert') ];
        if (changed) {
            // swap two sets
            var tmp = ids1;
            ids1 = ids0;
            ids0 = tmp;
        }

        var ids = (this.id_value && !changed ? ids1 : ids0);
        ids.push(this.btnId('delete'));
        ids.push(this.btnId('add'));

        ids1.forEach(function(id) { Ext.getCmp(id).enable(); });
        ids0.forEach(function(id) { Ext.getCmp(id).disable(); });
    },

    // Change field value and update the auto-filled status.
    vset: function (name, val) {
        var at = this.attr[name];
        if (at.disable)
            return;
        val = Userman.trim(val);
        this.data.set(name, val);

        // Define whether field can be auto-filled
        if (val == "") {
            at.requested = false; // re-enable nextSeq() requests
            at.can_set = true; // empty - modifiable
        } else if (!this.data.isModified(name)) {
            at.can_set = false; // original - not modifiable
        } else if (at.field && at.field.getValue() == val) {
            at.can_set = false; // entered by user - not modifiable
        } else {
            at.can_set = true; // calculated - modifiable
        }
    },

    // Return true if the field can be auto-filled
    isAuto: function (name) {
        return (this.attr[name].can_set && !this.attr[name].disable);
    },

    // Return field value
    vget: function (name) {
        return Userman.trim(this.data.get(name));
    },

    // Change field value only if it was not loaded from server as non-empty
    // or not modified by user or if was deliberately cleared by user.
    setIf: function (name, val) {
        if (this.isAuto(name)) {
            this.vset(name, val);
            return true;
        }
        return false;
    },

    // Return a standard auto-calculated field which can
    // contain values of other fields substitued in.
    getSubst: function (what, override) {
        var dn = Userman.getConfig(what) || "";
        var name;
    	while ((name = dn.match(/\$\((\w+)\)/)) != null) {
	    	name = name[1];
	    	var val = "";
	    	if (override != undefined && override != null && (name in override))
	    	    val = Userman.trim(override[name]);
	    	if (val == "")
	    	    val = this.vget(name);
         	if (val == "") {
	            dn = "";
	            break;
            }
            dn = dn.replace(/\$\((\w+)\)/, val);
	    }
    	return dn;
    },

    // Aatomatically fill constant fields and copies
    fillDefs: function () {
        for (var name in this.attr) {
            var desc = this.attr[name].desc;
            if (desc.defval != null)
                this.setIf(name, desc.defval);
            if (desc.copyfrom != null && !this.isAuto(desc.copyfrom))
                this.setIf(name, this.vget(desc.copyfrom));
        }
    },

    //
    // Request next available value for auto-increment fields.
    // Request is fired automatically when the field is
    // initially empty or deliberately cleared by user.
    //
    nextSeq: function (which, name, format) {
        // do not send request if:
        //   * another request is being processed for this field
        //   * this field is already requested and not yet cleared by user
        if (!this.isAuto(name))
            return;
        var at = this.attr[name];
        if (at.requesting || (at.requested && this.vget(name) != ""))
            return;
        at.requesting = at.requested = true;

        //Userman.debug("nextSeq(%s,%s/%s)...", which, this.name, name);
        Ext.Ajax.request({
            url: "next-id.php",
            method: "GET",
            params: { which: which },
            timeout: Userman.FORM_TIMEOUT * 1000,

            success: function (resp, opts) {
                at.requesting = false;
                var id = Userman.trim(resp.responseText).replace(/[^0-9]/g, "");
                if (format)
                    id = format(id);
                // user might have already filled the value while the request
                // was processing, don't touch the value then.
                if (this.setIf(name, id)) {
                    // for visual fields, also update the UI
                    if (this.attr[name].field)
                        this.attr[name].field.setValue(id);
                }
                Userman.debug("nextSeq(%s,%s/%s)=\"%s\"", which, this.name, name, id);
            },

            failure: function (resp, opts) {
                at.requesting = false;
                Userman.debug("nextSeq(%s,%s/%s):FAIL", which, this.name, name);
            },
            scope: this
        });
    },

    // return DOM id of a given button: "save", "revert" etc
    btnId: function (op) {
        return this.name + "_btn_" + op;
    },

    // setup visual/hidden data field
    setupField: function (name) {
        var desc = Userman.all_attrs[this.name][name];

        var at = this.attr[name] = {
            // can_set = true if field can be auto-calculatable,
            //           returned by isAuto()
            can_set: true,
            name: name,
            disable: desc.disable,
            desc: desc,
            field: null, // visual field or null for hidden fields
            id: this.name + "_field_" + name,
            requesting: false, // true = ajax request is activated by the field helper
            requested: false // true = the field is already loaded via ajax
        };

        if (desc.disable || !desc.visual)
             return at;

        if (desc.colwidth) {
            // non-zero column width means that the field
            // should be included in the record list
            this.list_width += desc.colwidth + Userman.COL_GAP;
            this.list_cols.push({
                header: Userman.T(desc.label),
                dataIndex: name,
                sortable: true,
                width: desc.colwidth,
            });
        }

        var cfg = {
            id: at.id,
            name: name,
            fieldLabel: Userman.T(desc.label),
            readonly: desc.readonly,
            anchor: "-" + Userman.RIGHT_GAP,
            _attr: at,
        };

        if (desc.type == "pass"
                && !Userman.toBool(Userman.getConfig("show_password")))
            cfg.inputType = "password";

        // the popup property controls whether field is a
        // simple text entry field or some kind of combo box

        if (desc.popup === "yesno") {
            // the field can take only two values, yes or no
            Ext.apply(cfg, {
                store: [ "No", "Yes" ],
                editable: false,
                allowBlank: false,
                triggerAction: "all"
            });
            at.field = new Ext.form.ComboBox(cfg);

        } else if (desc.popup === "gid") {
            // add single-select drop-down list of groups to the field
            Ext.apply(cfg, {
                store: Userman.std_lists["groups"].store,
                mode: "local",
                allowBlank: false,
                forceSelection: false,
                triggerAction: "all",
                displayField: "cn",
                valueField: "cn"
            });
            at.field = new Ext.form.ComboBox(cfg);

        } else if (desc.popup in Userman.std_lists) {
            // add multi-select drop-down list with a given dictionary
            Ext.apply(cfg, {
                store: Userman.std_lists[desc.popup].store,
                mode: "local",
                allowBlank: true,
                forceSelection: false,
                triggerAction: "all",
                hideOnSelect: false,
                displayField: Userman.std_lists[desc.popup].attr,
                valueField: Userman.std_lists[desc.popup].attr,
                checkField: "_checked_" + cfg.id
            });
            at.field = new Userman.MultiComboBox(cfg);

        } else if (! desc.popup) {
            // it's a simple text entry field
            at.field = new Ext.form.TextField(cfg);
            at.field.on("valid", this.onModified, this);
            //cfg.enableKeyEvents = true;
            //at.field.on("keyup", this.onModified, this);
        } else {
            // shame on me!
            Ext.Msg.alert(Userman.T("Unknown popup type \"%s\"", desc.popup));
        }

        return at;
    },

    //
    // Return true if any non-disabled visual attributes exist for the object
    //
    isComplete: function () {
        return (this.form_tabs.length > 0);
    },

    //
    // Create panel for data object, including:
    //   form_panel:
    //     * entry form packed with visual fields
    //     * form title reflects the current record id
    //     * form contains "save" and "revert" buttons
    //   list_panel:
    //     list of all object records
    //
    createPanel: function () {
        var _this = this;

        // Entry form packed with visual fields
        this.form_panel = new Ext.FormPanel({
            region: "center",
            id: this.name + "_form",
            // form title reflects the record id, initially nothing
            title: "...",
            url: this.write_url,
            border: false,
            layout: "fit",
            timeout: Userman.FORM_TIMEOUT,

            reader: new Ext.data.JsonReader({
                root: "obj",
                idProperty: this.id_attr,
                fields: this.obj_attrs
            }),

            items: [{
                // this form is tabbed, its panel contains a single TabPanel item
                xtype: "tabpanel",
                id: this.name + "_subtabs",
                activeItem: 0,
                // tab descriptors are created during object construction
                items: this.form_tabs
            }],

            bbar: [ "->", {
                // this button submits the form
                text: Userman.T("Save"),
                icon: "images/apply.png",
                scale: "medium",
                // add_button_css is a CSS selector which allows
                // for additional button effects, e.g. gentle border
                ctCls: Userman.getConfig("add_button_css"),
                handler: this.save,
                scope: this,
                id: this.btnId("save")
            },{
                // this button reverts changes
                text: Userman.T("Revert"),
                icon: "images/revert.png",
                scale: "medium",
                ctCls: Userman.getConfig("add_button_css"),
                handler: this.onRevert,
                scope: this,
                id: this.btnId("revert")
            },
            " " ]
        });

        this.form = this.form_panel.getForm();

        // list of all object records
        this.list_panel = new Ext.grid.GridPanel({
            store: this.list_store,
            title: Userman.T(this.title),
            id: this.name + "_list",

            colModel: new Ext.grid.ColumnModel({
                columns: this.list_cols
            }),

            selModel: new Ext.grid.RowSelectionModel({
                singleSelect: true,
            }),

            region: "west",
            split: true,
            collapsible: true,
            //collapseMode: "mini",
            width: this.list_width,
            minSize: 50
        });

        this.list_panel.getSelectionModel().on("rowselect", this.load, this);

        var buttons = [ " ", {
                // "create" button will clear up the form
                text: Userman.T("Create"),
                icon: "images/add.png",
                scale: "medium",
                ctCls: Userman.getConfig("add_button_css"),
                handler: this.clear,
                scope: this,
                id: this.btnId("add")
            },{
                // "delete" button will send request to delete current record
                text: Userman.T("Delete"),
                icon: "images/delete.png",
                scale: "medium",
                ctCls: Userman.getConfig("add_button_css"),
                handler: this.onDelete,
                scope: this,
                id: this.btnId("delete")
            },{
                // refresh record list and clear up the form
                text: Userman.T("Refresh"),
                icon: "images/refresh.png",
                scale: "medium",
                ctCls: Userman.getConfig("add_button_css"),
                handler: this.refresh,
                scope: this,
                id: this.btnId("refresh")
            },
            // on the bottom right is the ajax activity indicator
            "->",
            new Userman.Throbber()
            ];

        // combine list and form into single panel
        this.obj_panel = new Ext.Panel({
            title: Userman.T(this.title),
            id: this.name + "_gui",
            layout: "border",
            items: [ this.list_panel, this.form_panel ],
            bbar: {
                xtype: "toolbar",
                id: this.name + "_tb",
                items: buttons
            }
        });

        return this.obj_panel;
    }

});

/////////////////////////////////////////////////////////
// Users
//

Userman.User = Ext.extend(Userman.Object, {
    name: "user",
    list: "users",
    title: " Users ",
    id_attr: "uid",

    formTitle: function () {
        return this.vget("uid") + " (" + this.vget("cn") + ")";
    },

    rework: function () {
        var uid = this.vget("uid");
        var cn = this.vget("cn");
        var gn = this.vget("givenName");
        var sn = this.vget("sn");

        // ############# POSIX ############

        // name
        if (this.isAuto("cn"))
            this.setIf("cn", (cn = gn + (sn && gn ? " " : "") + sn));

        // identifier
        if (this.isAuto("uid"))
            uid = sn == "" ? gn : gn.substr(0, 1) + sn;
        this.vset("uid", (uid = Userman.toId(uid)));

        //#this.vset("objectClass", append_list(this.vget("objectClass"), Userman.getConfig("unix_user_classes"));

        this.setIf("dn", this.getSubst("unix_user_dn"));
        this.setIf("ntDn", this.getSubst("ad_user_dn"));

        // assign next available UID number
        if (this.isAuto("uidNumber")) {
            var uidn = this.vget("uidNumber");
            uidn = uidn.replace(/[^0-9]/g, "");
            this.vset("uidNumber", uidn);
        }
        this.nextSeq("unix_uidn", "uidNumber");

        // mail
        if (uid != "")
            this.setIf("mail", uid + "@" + Userman.getConfig("mail_domain"));

        // home directory
        if (uid != "")
            this.setIf("homeDirectory", Userman.getConfig("home_root") + "/" + uid);

        // ############# Active Directory ############

        //#this.vset("ntObjectClass", append_list(this.vget("ntObjectClass"), Userman.getConfig("ad_user_classes")));

        //#this.setIf("objectCategory", Userman.getConfig("ad_user_category")
        //#             + "," + path2dn(Userman.getConfig("ad_domain")));

        this.setIf("userPrincipalName", uid + "@" + Userman.getConfig("ad_domain"));

        //#var pass = this.vget("password");
        //#if (pass === Userman.getConfig("OLD_PASS")) {
        //#    this.vset("userAccountControl", this.vget("userAccountControl", array(orig => true)));
        //#} else {
        //#    var uac = this.vget("userAccountControl") || ADS_UF_NORMAL_ACCOUNT;
        //#    uac &= ~(ADS_UF_PASSWD_NOT_REQUIRED | ADS_UF_DONT_EXPIRE_PASSWD);
        //#    uac |= (pass == "" ? ADS_UF_PASSWD_NOT_REQUIRED : ADS_UF_DONT_EXPIRE_PASSWD);
        //#    this.vset("userAccountControl", uac);
        //#}

        // ######## CommuniGate Pro ########

        var telnum = this.vget("telnum");
        this.vset("telnum", Userman.formatTelnum(telnum));
        this.nextSeq("cgp_telnum", "telnum", Userman.formatTelnum);

        this.vset("domainIntercept", Userman.fromBool(this.vget("domainIntercept")) );
        this.vset("userIntercept", Userman.fromBool(this.vget("userIntercept")) );
    }

});

/////////////////////////////////////////////////////////
// Groups
//

Userman.Group = Ext.extend(Userman.Object, {
    name: "group",
    list: "groups",
    title: " Groups ",
    id_attr: "cn",

    formTitle: function () {
        return this.vget("cn");
    },

    rework: function () {
        this.vset("objectClass", Userman.getConfig("unix_group_classes"));
        this.vset("cn", Userman.toId(this.vget("cn")));
        this.vset("gidNumber", this.vget("gidNumber").replace(/[^0-9]/g, ""));
        this.nextSeq("unix_gidn", "gidNumber");
        this.vset("dn", this.getSubst("unix_group_dn"));
    }

});

/////////////////////////////////////////////////////////
// Mail groups
//

Userman.Mailgroup = Ext.extend(Userman.Object, {
    name: "mailgroup",
    list: "mailgroups",
    title: " Mail groups ",
    id_attr: "uid",

    formTitle: function () {
        return this.vget("uid");
    },

    rework: function () {
        this.vset("uid", Userman.toId(this.vget("uid")));
        this.setIf("cn", this.vget("uid"));

        // ###### constant (& not copyfrom) fields ########
        this.fillDefs();
    }

});


/////////////////////////////////////////////////////////
// GUI
//

//
// Creates a nice animated effect ending the UI preloading message.
//
Userman.hidePreloader = function () {
    var pre_mask = Ext.get("preloading-mask");
    var pre_box = Ext.get("preloading-box");

    //	Hide loading message	
    pre_box.fadeOut({ duration: 0.2, remove: true });

    //	Hide loading mask
    pre_mask.setOpacity(0.9);
    pre_mask.shift({
        xy: pre_box.getXY(),
        width: pre_box.getWidth(),
        height: pre_box.getHeight(),
        remove: true,
        duration: 0.7,
        opacity: 0.1,
        easing: "bounceOut"
    });
}

//
// Initializers for data stores of all main object lists
// are kept in a central place to avoid extra requests
// due to their use both in object lists and in helper fields.
//
Userman.std_lists = {
    "users": {
        url: "user-list.php",
        attr: "uid",
        fields: [ "uid", "cn" ]
    },
    "groups": {
        url: "group-list.php",
        attr: "cn",
    },
    "mailgroups": {
        url: "mailgroup-list.php",
        attr: "uid"
    },
    "mailusers": {
        url: "mailuser-list.php",
        attr: "uid"
    }
};

//
// Main routine
//
Userman.main = function () {

    Userman.hidePreloader();
    Ext.QuickTips.init();

    // create data stores for all standard lists
    for (var name in Userman.std_lists) {
        var list = Userman.std_lists[name];
        var fields = list.fields || [ list.attr ];
        list.store = new Ext.data.JsonStore({
            url: list.url,
            root: "rows",
            idProperty: list.attr,
            fields: fields,
            autoLoad: false
        });
    }

    // create tabbed panels for all objects
    var tabs = [];
    var objs = [ new Userman.User(), new Userman.Group(), new Userman.Mailgroup() ];
    objs.forEach(function(obj) {
        if (obj.isComplete())
            tabs.push(obj.createPanel());
    });

    // fire up loading of list stores
    for (var name in Userman.std_lists)
        Userman.std_lists[name].store.load();

    // create main UI
    new Ext.Viewport({
        defaults: {
            bodyStyle: "padding: " + Userman.VIEWPORT_PADDING,
        },
        layout: "border",
        id: "viewport",
        listeners: {
            afterrender: function() {
                objs.forEach(function(obj) {
                    if (obj.isComplete())
                        obj.clear();
                });
            }
        },
        items: [{
            xtype: "tabpanel",
            region: "center",
            activeTab: 0,
            items: tabs
        }]
    });
};


Ext.onReady(Userman.main);

/////////////////////////////////////////////////////////////


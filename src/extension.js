//const St = imports.gi.St;
const Gio = imports.gi.Gio;

//const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;


class Extension {
    constructor() {
        //this._indicator = null;
    }

    enable() {
        mylog('enabling');

/*
        let indicatorName = `${Me.metadata.name} Indicator`;

        // Create a panel button
        this._indicator = new PanelMenu.Button(0.0, indicatorName, false);

        // Add an icon
        let icon = new St.Icon({
            gicon: new Gio.ThemedIcon({name: 'face-sad-symbolic'}),
            style_class: 'system-status-icon'
        });
        this._indicator.add_child(icon);

        // `Main.panel` is the actual panel you see at the top of the screen,
        // not a class constructor.
        Main.panel.addToStatusArea(indicatorName, this._indicator);
*/
    }

    // REMINDER: It's required for extensions to clean up after themselves when
    // they are disabled. This is required for approval during review!
    disable() {
        mylog('disabling');

        //this._indicator.destroy();
        //this._indicator = null;
    }
}

function mylog(message) {
        log(`${Me.metadata.name}: ` + message);
}


function init() {
    log(`initializing ${Me.metadata.name}`);

    return new Extension();
}

const { GObject, Gio, GLib } = imports.gi;

// An XML DBus Interface
const token_interface_xml = `
<node>
    <interface name="org.gnome.SettingsDaemon.Smartcard.Token">
        <property name="Name" type="s" access="read"/>
        <property name="Driver" type="o" access="read"/>
        <property name="IsInserted" type="b" access="read"/>
        <property name="UsedToLogin" type="b" access="read"/>
    </interface>
</node>
`;

// Pass the XML string to make a re-usable proxy class for an interface proxies.
const TokenProxy = Gio.DBusProxy.makeProxyWrapper(token_interface_xml);

let proxy = null;

function showProps(proxy_, changed, invalidated) {
        for ( let [prop, value] of Object.entries(changed.deepUnpack()) ) {
		if( prop == 'IsInserted' ) {
			if( value.get_boolean()) {
    				print(`Card inserted`);

			} else {
    				print(`Card removed`);
			}
		}
        }
        for ( let prop of invalidated ) {
    	    print(`Property '${prop}' invalidated`);
        }
};

function onSmartCardAppeared(connection, name, _owner) {
    print(`"${name}" appeared on the session bus`);

    try {
        proxy = new TokenProxy(
            Gio.DBus.session,
	    'org.gnome.SettingsDaemon.Smartcard',
            '/org/gnome/SettingsDaemon/Smartcard/Manager/Tokens/token_from_p11_2d_kit_2d_proxy_2e_so_slot_17'
        );
    } catch (err) {
        log(err);
        return;
    }
 
    proxy.connect('g-properties-changed', showProps);
    //proxy.connect('g-properties-changed', (proxy_, changed, invalidated) => {
    //        for ( let [prop, value] of Object.entries(changed.deepUnpack()) ) {
    //    		print(`Properties ${prop}, changed to ${value}`);
    //        }
    //        for ( let prop of invalidated ) {
    //    	    print(`Property '${prop}' invalidated`);
    //        }
    //});
}

function onSmartCardVanished(connection, name) {
    print(`"${name}" vanished from the session bus`);

    if (proxy !== null) {
        proxy.disconnectSignal(proxySignalId);
        proxy.disconnect(proxyPropId);
        proxy = null;
    }
}

let busWatchId = Gio.bus_watch_name(
    Gio.BusType.SESSION,
    'org.gnome.SettingsDaemon.Smartcard',
    Gio.BusNameWatcherFlags.NONE,
    onSmartCardAppeared,
    onSmartCardVanished
);

// Start an event loop
let loop = GLib.MainLoop.new(null, false);
loop.run();

// Unwatching names works just like disconnecting signal handlers.
//Gio.bus_unown_name(busWatchId);

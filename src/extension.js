//const St = imports.gi.St;
const { GObject, Gio, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
//const Main = imports.ui.main;
//const PanelMenu = imports.ui.panelMenu;

function mylog(message) {
        log(`${Me.metadata.name}: ` + message);
}

function onSmartCardAppeared(connection, name, _owner) {
	mylog(`"${name}" appeared on the session bus`);

	const notification_tokens = new GLib.Variant('()', [
		'GNOME Smartcard Lock',
		0,
		'dialog-information-symbolic',
		'Locking Title',
		'Locking Body',
		[],
		{},
		-1
	]);

	connection.call(
		'org.gnome.SettingsDaemon.Smartcard',
		'/org/gnome/SettingsDaemon/Smartcard/Manager',
		'org.gnome.SettingsDaemon.Smartcard.Manager',
		'GetInsertedTokens',
		notification_tokens,
		null,
		Gio.DBusCallFlags.NONE,
		-1,
		null,
		(session, res) => {
			try {
				const reply = session.call_finish(res);
				values = reply.get_child_value(0);
				for( let [prop, value] of Object.entries(values.deepUnpack()) ) {
					mylog(`Following presence of smartcard: ${value}`);
					try {
						let TokenProxy = Gio.DBusProxy.makeProxyWrapper(token_interface_xml);
						proxy = new TokenProxy(
							Gio.DBus.session,
							'org.gnome.SettingsDaemon.Smartcard',
							value
						);
						proxy.connect('g-properties-changed', checkSmartCardRemoved);
						g_sc_proxies.push(proxy);
					} catch (err) {
						mylog(err);
						return;
					}
				}
			} catch(e) {
				if (e instanceof Gio.DBusError)
					Gio.DBusError.strip_remote_error(e);
				mylog(e);
			}
		}
	);
}

function onSmartCardVanished(connection, name) {
		print(`"${name}" vanished from the session bus`);
		
		//if (Me.proxies !== null) {
		//	for ( proxy of Me.proxies) {
		//		proxy.disconnectSignal(proxySignalId);
		//		proxy.disconnect(proxyPropId);
		//		proxy = null;
		//	}
		//}
}

function checkSmartCardRemoved(proxy_, changed, invalidated) {
	for ( let [prop, value] of Object.entries(changed.deepUnpack()) ) {
		if( prop == 'IsInserted' ) {
			if( ! value.get_boolean()) {
				// print(`Card removed`);

				Gio.DBus.session.call(
					'org.gnome.ScreenSaver',
					'/org/gnome/ScreenSaver',
					'org.gnome.ScreenSaver',
					'Lock',
					null,
					null,
					Gio.DBusCallFlags.NONE,
					-1,
					null,
					null
				);
				mylog(`Requested org.gnome.ScreenSaver to lock`);
			}
		}
	}
	for ( let prop of invalidated ) {
	    mylog(`Property '${prop}' invalidated`);
	}
};
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

g_sc_proxies = [];


class Extension {
	constructor() {
		this.busWatchId = null;
	}

	
	enable() {
		mylog('enabling');
		g_sc_proxies = [];
		this.busWatchId = Gio.bus_watch_name(
			Gio.BusType.SESSION,
			'org.gnome.SettingsDaemon.Smartcard',
			Gio.BusNameWatcherFlags.NONE,
			onSmartCardAppeared,
			onSmartCardVanished
		);

	}
	
	// REMINDER: It's required for extensions to clean up after themselves when
	// they are disabled. This is required for approval during review!
	disable() {
		mylog('disabling');
		g_sc_proxies = [];
		this.busWatchId = null;
	}
}

function init() {
	mylog(`initializing`);
	return new Extension();
}

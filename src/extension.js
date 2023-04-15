/*
 * Copyright 2023 Rui Miguel Silva Seabra <rms@1407.org> GPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify it under the
 * terms of the GNU General Public License as published by the Free Software Foundation,
 * either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 *
 * If not, see <https://www.gnu.org/licenses/>.
 *
 */

const { GObject, Gio, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function proxy_cleanup(connection, name) {
	if (proxies !== null) {
		for (let [proxyPropId, proxy] of proxies) {
			proxy.disconnect(proxyPropId);
			proxy = null;
		}
	}
	proxies = null;
}


function mylog(message) {
	if(Me.metadata.debug == true) log(`${Me.metadata.name}: ` + message);
}

function onSmartCardAppeared(connection, name, _owner) {
	//log(`"${name}" appeared on the session bus`);

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
						let proxy = new TokenProxy(
							Gio.DBus.session,
							'org.gnome.SettingsDaemon.Smartcard',
							value
						);
						let id = proxy.connect('g-properties-changed', checkSmartCardRemoved);
						proxies.set(id, proxy);
					} catch (err) {
						log(`${Me.metadata.name}: ${err}`);
						return;
					}
				}
			} catch(e) {
				if (e instanceof Gio.DBusError)
					Gio.DBusError.strip_remote_error(e);
				log(`${Me.metadata.name}: ${e}`);
			}
		}
	);
}

function onSmartCardVanished(connection, name) {
	// mylog(`"${name}" vanished from the session bus`);
	proxy_cleanup();
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

proxies = new Map();

class Extension {
	constructor() {
		this.busWatchId = 0;
	}

	
	enable() {
		mylog('enabling');
		proxies = new Map();
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
		proxy_cleanup();
		Gio.bus_unwatch_name(this.busWatchId);
		this.busWatchId = 0;
	}
}

function init() {
	mylog(`initializing`);
	return new Extension();
}

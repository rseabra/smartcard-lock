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

function g_sc_l_proxy_cleanup(connection, name) {
	if (g_sc_l_proxies !== null) {
		for (let [proxyPropId, proxy] of g_sc_l_proxies) {
			proxy.disconnect(proxyPropId);
			proxy = null;
		}
	}
	g_sc_l_proxies = null;
}


function g_sc_l_log(message) {
        log(`${Me.metadata.name}: ` + message);
}

function g_sc_l_onSmartCardAppeared(connection, name, _owner) {
	//g_sc_l_log(`"${name}" appeared on the session bus`);

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
					g_sc_l_log(`Following presence of smartcard: ${value}`);
					try {
						let TokenProxy = Gio.DBusProxy.makeProxyWrapper(g_sc_l_token_interface_xml);
						let proxy = new TokenProxy(
							Gio.DBus.session,
							'org.gnome.SettingsDaemon.Smartcard',
							value
						);
						let id = proxy.connect('g-properties-changed', g_sc_l_checkSmartCardRemoved);
						g_sc_l_proxies.set(id, proxy);
					} catch (err) {
						g_sc_l_log(err);
						return;
					}
				}
			} catch(e) {
				if (e instanceof Gio.DBusError)
					Gio.DBusError.strip_remote_error(e);
				g_sc_l_log(e);
			}
		}
	);
}

function g_sc_l_onSmartCardVanished(connection, name) {
	// g_sc_l_log(`"${name}" vanished from the session bus`);
	g_sc_l_proxy_cleanup();
}
function g_sc_l_checkSmartCardRemoved(proxy_, changed, invalidated) {
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
				g_sc_l_log(`Requested org.gnome.ScreenSaver to lock`);
			}
		}
	}
	for ( let prop of invalidated ) {
	    g_sc_l_log(`Property '${prop}' invalidated`);
	}
};

const g_sc_l_token_interface_xml = `
<node>
    <interface name="org.gnome.SettingsDaemon.Smartcard.Token">
        <property name="Name" type="s" access="read"/>
        <property name="Driver" type="o" access="read"/>
        <property name="IsInserted" type="b" access="read"/>
        <property name="UsedToLogin" type="b" access="read"/>
    </interface>
</node>
`;

g_sc_l_proxies = new Map();

class Extension {
	constructor() {
		this.busWatchId = 0;
	}

	
	enable() {
		g_sc_l_log('enabling');
		g_sc_l_proxies = new Map();
		this.busWatchId = Gio.bus_watch_name(
			Gio.BusType.SESSION,
			'org.gnome.SettingsDaemon.Smartcard',
			Gio.BusNameWatcherFlags.NONE,
			g_sc_l_onSmartCardAppeared,
			g_sc_l_onSmartCardVanished
		);

	}
	
	// REMINDER: It's required for extensions to clean up after themselves when
	// they are disabled. This is required for approval during review!
	disable() {
		g_sc_l_log('disabling');
		g_sc_l_proxy_cleanup();
		Gio.bus_unwatch_name(this.busWatchId);
		this.busWatchId = 0;
	}
}

function init() {
	g_sc_l_log(`initializing`);
	return new Extension();
}

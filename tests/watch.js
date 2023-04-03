const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

// An XML DBus Interface
const ifaceXml = `
<node name="/" xmlns:doc="http://www.freedesktop.org/dbus/1.0/doc.dtd">
        <!--
        org.gnome.SettingsDaemon.Smartcard.Manager:

        An interface used for managing smartcard functionality.
        -->
        <interface name="org.gnome.SettingsDaemon.Smartcard.Manager">
                <method name="GetLoginToken">
                        <arg name="token" type="o" direction="out"/>
                </method>

                <method name="GetInsertedTokens">
                        <arg name="tokens" type="ao" direction="out"/>
                </method>
        </interface>

        <!--
        org.gnome.SettingsDaemon.Smartcard.Driver:

        The smartcard driver interface.
        -->
        <interface name="org.gnome.SettingsDaemon.Smartcard.Driver">
                <!--
                Library:
                Path to PKCS11 module
                -->
                <property name="Library" type="s" access="read"/>

                <!--
                Description:
                String describing the PKCS11 module
                -->
                <property name="Description" type="s" access="read"/>
        </interface>

        <!--
        org.gnome.SettingsDaemon.Smartcard.Token:

        The smartcard interface.
        -->
        <interface name="org.gnome.SettingsDaemon.Smartcard.Token">
                <!--
                Name:
                Name of the token
                -->
                <property name="Name" type="s" access="read"/>

                <!--
                Driver:
                Driver handling token
                -->
                <property name="Driver" type="o" access="read"/>

                <!--
                IsInserted:
                Whether or not the card is inserted
                -->
                <property name="IsInserted" type="b" access="read"/>

                <!--
                UsedToLogin:
                Whether or not the card was used to log in
                -->
                <property name="UsedToLogin" type="b" access="read"/>
        </interface>
</node>
`;

// Pass the XML string to make a re-usable proxy class for an interface proxies.
const TestProxy = Gio.DBusProxy.makeProxyWrapper(ifaceXml);

let proxy = null;
let proxySignalId = 0;
let proxyPropId = 0;

function showProps(props) {
        print(`PropertiesChanged: ${props}`);
        for (let [prop, value] of Object.entries(props.deepUnpack())) {
            print("foo1")
            print(`Property '${prop}' changed to '${value.deepUnpack()}'`);
        }
}

function onNameAppeared(connection, name, _owner) {
    //print(`"${name}" appeared on the session bus`);

    // If creating a proxy synchronously, errors will be thrown as normal
    //print("Creating Proxy");
    try {
        proxy = new TestProxy(
            Gio.DBus.session,
            'org.freedesktop.DBus.Properties',
            '/org/gnome/SettingsDaemon/Smartcard/Manager/Tokens'
        );
    } catch (err) {
        log(err);
        return;
    }
    //print("Proxy Created");


    // Proxy wrapper signals use the special functions `connectSignal()` and
    // `disconnectSignal()` to avoid conflicting with regular GObject signals.
    //print("Before connectSignal");
    proxySignalId = proxy.connectSignal('PropertiesChanged', showProps);
    //proxySignalId = proxy.connectSignal('PropertiesChangedSignal', (proxy_, name_, args) => {
    //    print(`PropertiesChangedSignal: ${args[0]}, ${args[1]}`);
    //});


    // To watch property changes, you can connect to the `g-properties-changed`
    // GObject signal with `connect()`
    proxyPropId = proxy.connect('g-properties-changed', (proxy_, changed, invalidated) => {
        for (let [prop, value] of Object.entries(changed.deepUnpack())) {
            print("foo1")
            print(`Property '${prop}' changed to '${value.deepUnpack()}'`);
        }

        for (let prop of invalidated) {
            print("foo2")
            print(`Property '${prop}' invalidated`);
        }
    });


    //// Reading and writing properties is straight-forward
    //print(`ReadOnlyProperty: ${proxy.PropertiesChanged}`);

    //print(`ReadWriteProperty: ${proxy.ReadWriteProperty}`);

    //proxy.ReadWriteProperty = !proxy.ReadWriteProperty;
    //print(`ReadWriteProperty: ${proxy.ReadWriteProperty}`);


    //// Both synchronous and asynchronous functions will be generated
    //try {
    //    let value = proxy.SimpleMethodSync();

    //    print(`SimpleMethod: ${value}`);
    //} catch (err) {
    //    log(`SimpleMethod: ${err.message}`);
    //}

    //proxy.ComplexMethodRemote('input string', (value, error, fdList) => {
    //    // If @error is not `null`, then an error occurred
    //    if (error !== null) {
    //        log(error);
    //        return;
    //    }

    //    print(`ComplexMethod: ${value}`);

    //    // Methods that return file descriptors are fairly rare, so you should
    //    // know to expect one or not.
    //    if (fdList !== null) {
    //        //
    //    }
    //});
}

function onNameVanished(connection, name) {
    //print(`"${name}" vanished from the session bus`);

    if (proxy !== null) {
        proxy.disconnectSignal(proxySignalId);
        proxy.disconnect(proxyPropId);
        proxy = null;
    }
}

//let busWatchId = Gio.bus_watch_name(
//    Gio.BusType.SESSION,
//    'org.freedesktop.systemd1',
//    Gio.BusNameWatcherFlags.NONE,
//    onNameAppeared,
//    onNameVanished
//);

// Start an event loop
let loop = GLib.MainLoop.new(null, false);
loop.run();

// Unwatching names works just like disconnecting signal handlers.
//Gio.bus_unown_name(busWatchId);

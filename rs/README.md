# @extplug/room-settings

HTTP interface to the ExtPlug Room Settings repository.

## How It Works

First `@extplug/room-settings` uses [plug-auth-server][] to authenticate users
to the server. Then, it checks that users are actually cohosts or hosts in the
rooms they are trying to change, by joining the room using [miniplug][].
Finally, the room settings are updated in the
[FAERSS (Fully Automated ExtPlug Room Settings Storage)][faerss] using the
Github web API.

## License

[MIT](../LICENSE)

[plug-auth-server]: https://github.com/goto-bus-stop/plug-auth/tree/master/packages/plug-auth-server
[miniplug]: https://github.com/goto-bus-stop/miniplug
[faerss]: https://github.com/extplug/faerss

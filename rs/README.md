# @extplug/room-settings

HTTP interface to the ExtPlug Room Settings repository.

## How It Works

First `@extplug/room-settings` uses [plug-auth-server][] to authenticate users to the server.
Then, it checks that users are actually cohosts or hosts in the rooms they are trying to change, by joining the room using [miniplug][].
Finally, the room settings are updated in the [FAERSS (Fully Automated ExtPlug Room Settings Storage)][faerss] using the Github web API.

## API

### `GET /:room`, `GET /:room.json`

Return the room settings JSON for a room.

### `GET /:room.css`

Return the custom styles for a room.

### `GET /:room/history`

Return a JSON array containing the recent changes to the room settings and styles.

Example response:

```js
[
  {
    // Commit SHA
    id: "b526bf6a701a8196669153f1389df788efa873ce",
    // Commit message
    message: "[extplug] Update room settings.\n\nhttps://plug.dj/extplug",
    // plug.dj user ID of the committer
    user: 4393540,
    // timestamp of the change
    time: 1489516848000
  }
]
```

## License

[MIT](../LICENSE)

[plug-auth-server]: https://github.com/goto-bus-stop/plug-auth/tree/master/packages/plug-auth-server
[miniplug]: https://github.com/goto-bus-stop/miniplug
[faerss]: https://github.com/extplug/faerss

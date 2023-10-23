import React, { useRef } from "react";
import { useState, useLayoutEffect } from "react";
import Client from "./Client";
import logo from "./logo192.png";
import audioWave from "./audio-wave.gif";
import { SnapControl, Snapcast } from "../snapcontrol";
import {
  Alert,
  Button,
  Card,
  CardMedia,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  SkipPrevious as SkipPreviousIcon,
  SkipNext as SkipNextIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { config } from "../config";

type GroupClient = {
  client: Snapcast.Client;
  inGroup: boolean;
  wasInGroup: boolean;
};

type GroupProps = {
  server: Snapcast.Server;
  group: Snapcast.Group;
  snapcontrol: SnapControl;
  showOffline: boolean;
};

type GroupVolumeChange = {
  volumeEntered: boolean;
  client_volumes: Map<string, number>;
  group_volume: number;
};

export default function Group(props: GroupProps) {
  const [update, setUpdate] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clients, setClients] = useState<GroupClient[]>([]);
  const [streamId, setStreamId] = useState("");
  const [deletedClients, setDeletedClients] = useState<Snapcast.Client[]>([]);
  const [volume, setVolume] = useState(0);
  const groupVolumeChange = useRef<GroupVolumeChange>({
    volumeEntered: true,
    client_volumes: new Map<string, number>(),
    group_volume: 0,
  });

  function updateVolume() {
    let clients = getClients();
    let volume = 0;
    for (let client of clients) volume += client.config.volume.percent;
    volume /= clients.length;
    setVolume(volume);
  }

  useLayoutEffect(() => {
    console.debug("useLayoutEffect");
    updateVolume();
  });

  function handleSettingsClicked(event: React.MouseEvent<HTMLButtonElement>) {
    console.debug("handleSettingsClicked");

    let clients: GroupClient[] = [];
    for (let group of props.server.groups) {
      for (let client of group.clients) {
        let inGroup: boolean = props.group.clients.includes(client);
        clients.push({ client: client, inGroup: inGroup, wasInGroup: inGroup });
      }
    }

    // this.clients = [];
    // props.server.groups.map(group => group.clients.map(client => this.clients.push(client.id)));
    setSettingsOpen(true);
    setClients(clients);
    setStreamId(props.group.stream_id);
  }

  function handleSettingsClose(apply: boolean) {
    console.debug("handleSettingsClose: " + apply);
    if (apply) {
      let changed: boolean = false;
      for (let element of clients) {
        if (element.inGroup !== element.wasInGroup) {
          changed = true;
          break;
        }
      }

      if (changed) {
        let groupClients: string[] = [];
        for (let element of clients)
          if (element.inGroup) groupClients.push(element.client.id);
        console.log(groupClients);
        props.snapcontrol.setClients(props.group.id, groupClients);
      }

      if (props.group.stream_id !== streamId)
        props.snapcontrol.setStream(props.group.id, streamId);
    }
    setSettingsOpen(false);
  }

  const getDragableItemStyle = (isDragging: boolean, draggableStyle: any) => ({
    // some basic styles to make the items look a bit nicer
    userSelect: "none",
    padding: 8 * 2,
    margin: `0 0 8px 0`,

    // change background colour if dragging
    background: isDragging ? "primary" : "none",
    borderRadius: "15px",

    // styles we need to apply on draggables
    ...draggableStyle,
  });

  function handleGroupClientChange(client: Snapcast.Client, inGroup: boolean) {
    console.debug(
      "handleGroupClientChange: " + client.id + ", in group: " + inGroup
    );
    let newclients = clients;
    let idx = newclients.findIndex((element) => element.client === client);
    newclients[idx].inGroup = inGroup;
    setClients(newclients);
    // dummy update, since the array was just mutated
    setUpdate(update + 1);
  }

  function handleClientDelete(client: Snapcast.Client) {
    console.debug("handleClientDelete: " + client.getName());
    let newDeletedClients = deletedClients;
    if (!newDeletedClients.includes(client)) newDeletedClients.push(client);
    setDeletedClients(newDeletedClients);
    // dummy update, since the array was just mutated
    setUpdate(update + 1);
  }

  function handleClientVolumeChange(client: Snapcast.Client) {
    console.debug("handleClientVolumeChange: " + client.getName());
    updateVolume();
  }

  function handleSnackbarClose(client: Snapcast.Client, undo: boolean) {
    console.debug(
      "handleSnackbarClose, client: " + client.getName() + ", undo: " + undo
    );
    if (!undo) props.snapcontrol.deleteClient(client.id);

    let newDeletedClients = deletedClients;
    if (newDeletedClients.includes(client))
      newDeletedClients.splice(newDeletedClients.indexOf(client), 1);

    setDeletedClients(newDeletedClients);
    setUpdate(update + 1);
  }

  function handleMuteClicked() {
    console.debug("handleMuteClicked");
    props.group.muted = !props.group.muted;
    props.snapcontrol.muteGroup(props.group.id, props.group.muted);
    setUpdate(update + 1);
  }

  function handleVolumeChange(value: number) {
    console.debug("handleVolumeChange: " + value);
    if (groupVolumeChange.current.volumeEntered) {
      groupVolumeChange.current.client_volumes.clear();
      groupVolumeChange.current.group_volume = 0;
      for (let client of getClients()) {
        groupVolumeChange.current.client_volumes.set(
          client.id,
          client.config.volume.percent
        );
        groupVolumeChange.current.group_volume += client.config.volume.percent;
      }
      groupVolumeChange.current.group_volume /=
        groupVolumeChange.current.client_volumes.size;
      groupVolumeChange.current.volumeEntered = false;
    }

    let delta = value - groupVolumeChange.current.group_volume;
    let ratio: number;
    if (delta < 0)
      ratio =
        (groupVolumeChange.current.group_volume - value) /
        groupVolumeChange.current.group_volume;
    else
      ratio =
        (value - groupVolumeChange.current.group_volume) /
        (100 - groupVolumeChange.current.group_volume);

    for (let client of getClients()) {
      let new_volume = groupVolumeChange.current.client_volumes.get(client.id)!;
      if (delta < 0) new_volume -= ratio * new_volume;
      else new_volume += ratio * (100 - new_volume);

      client.config.volume.percent = new_volume;
      props.snapcontrol.setVolume(client.id, new_volume);
    }

    setVolume(value);
  }

  function handleVolumeChangeCommitted(value: number) {
    console.debug("handleVolumeChangeCommitted: " + value);
    groupVolumeChange.current.volumeEntered = true;
  }

  function handlePlayPauseClicked() {
    if (
      props.server.getStream(props.group.stream_id)?.properties
        .playbackStatus === "playing"
    )
      props.snapcontrol.control(props.group.stream_id, "pause");
    else props.snapcontrol.control(props.group.stream_id, "play");
  }

  function snackbar() {
    return deletedClients.map((client) => (
      <Snackbar
        open
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={6000}
        key={"snackbar-" + client.id}
        onClose={(_, reason: string) => {
          if (reason !== "clickaway") handleSnackbarClose(client, false);
        }}
      >
        <Alert
          onClose={(_) => {
            handleSnackbarClose(client, false);
          }}
          severity="info"
          sx={{ width: "100%" }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={(_) => {
                handleSnackbarClose(client, true);
              }}
            >
              Undo
            </Button>
          }
        >
          Deleted {client.getName()}
        </Alert>
      </Snackbar>
    ));
  }

  function getClients(): Snapcast.Client[] {
    let clients = [];
    for (let client of props.group.clients) {
      if (
        (client.connected || props.showOffline) &&
        !deletedClients.includes(client)
      ) {
        clients.push(client);
      }
    }
    return clients;
  }

  console.debug("Render Group " + props.group.id);
  let clienten: Snapcast.Client[] = getClients();

  // for (let client of getClients()) {
  //   clienten.push(
  //     <Client
  //       key={client.id}
  //       client={client}
  //       snapcontrol={props.snapcontrol}
  //       dragHandleProps={provided.dragHandleProps}
  //       onDelete={() => {
  //         handleClientDelete(client);
  //       }}
  //       onVolumeChange={() => {
  //         handleClientVolumeChange(client);
  //       }}
  //     />
  //   );
  // }
  if (clienten.length === 0) return <div>{snackbar()}</div>;
  let stream = props.server.getStream(props.group.stream_id);
  let artUrl = stream?.properties.metadata.artUrl
    ? config.baseUrl.replace("ws://", "http://").replace("wss://", "https://") +
      "/" +
      stream?.properties.metadata.artUrl?.split("/")[3]
    : logo; // Hack, otherwise url = hostname which doesn't work on Safari
  let title = stream?.properties.metadata.title || "Unknown Title";
  let artist: string = stream?.properties.metadata.artist
    ? stream!.properties.metadata.artist!.join(", ")
    : "Unknown Artist";
  let playing: boolean = stream?.status === "playing";

  console.debug("Art URL: " + artUrl);

  let allClients = [];
  for (let group of props.server.groups)
    for (let client of group.clients) allClients.push(client);

  return (
    <div>
      <Card
        sx={{
          py: 2,
          px: 4,
          my: 2,
          flexGrow: 1,
          borderRadius: "15px",
          border: "none",
        }}
      >
        {/* <Stack spacing={2} direction="column" alignItems="center"> */}
        <Stack spacing={0} direction="column" alignItems="left">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            {/* group name */}
            <Stack direction="row" justifyContent="center" alignItems="center">
              <FormControl variant="standard">
                <Select
                  sx={{ fontWeight: "bold", fontSize: "1.1em" }}
                  id="stream"
                  value={props.group.stream_id}
                  label="Stream"
                  onChange={(event) => {
                    let stream: string = event.target.value;
                    setStreamId(stream);
                    props.snapcontrol.setStream(props.group.id, stream);
                  }}
                >
                  {props.server.streams.map((stream) => (
                    <MenuItem
                      sx={{ fontWeight: "bold" }}
                      key={stream.id}
                      value={stream.id}
                    >
                      {stream.id.charAt(0).toUpperCase() + stream.id.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* icon */}
            <IconButton
              aria-label="Options"
              onClick={(event) => {
                handleSettingsClicked(event);
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Grid>

          <Stack spacing={2} paddingY={2} direction="row" alignItems="center">
            <CardMedia
              component="img"
              sx={{ width: 48 }}
              image={artUrl}
              alt={title + " cover"}
            />
            <Stack
              spacing={0}
              direction="column"
              justifyContent="center"
              sx={{ flexGrow: 1, overflow: "hidden" }}
            >
              <Typography noWrap variant="subtitle1" align="left">
                {title}
              </Typography>
              <Typography noWrap variant="body1" align="left">
                {artist}
              </Typography>
            </Stack>
            {playing ? (
              <CardMedia
                component="img"
                sx={{ width: 36 }}
                image={audioWave}
                alt={title + " soundwave"}
              />
            ) : undefined}
          </Stack>
          {/* {clienten.length >= 1 && ( 
            <Stack spacing={2} paddingBottom={3} direction="row" alignItems="center">
              <IconButton
                aria-label="Mute"
                onClick={() => {
                  handleMuteClicked();
                }}
              >
                {props.group.muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
              <Slider
                aria-label="Volume"
                color="secondary"
                min={0}
                max={100}
                size="small"
                key={"slider-" + props.group.id}
                value={volume}
                onChange={(_, value) => {
                  handleVolumeChange(value as number);
                }}
                onChangeCommitted={(_, value) => {
                  handleVolumeChangeCommitted(value as number);
                }}
              />
            </Stack>
          )} */}
        </Stack>
        <Divider sx={{ marginTop: 0, marginBottom: 1 }} />
        <Droppable droppableId={`${props.group.id}`}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <>
                {clienten.map((item, index) => (
                  <Draggable
                    key={`${props.group.id}-${index}`}
                    draggableId={`draggable-${props.group.id}-${index}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...getDragableItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          ),
                          paddingBottom: "0px",
                        }}
                      >
                        <Client
                          key={item.id}
                          client={item}
                          snapcontrol={props.snapcontrol}
                          dragHandleProps={provided.dragHandleProps}
                          onDelete={() => {
                            handleClientDelete(item);
                          }}
                          onVolumeChange={() => {
                            handleClientVolumeChange(item);
                          }}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
              </>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </Card>

      <Dialog
        fullWidth
        open={settingsOpen}
        onClose={() => {
          handleSettingsClose(false);
        }}
      >
        <DialogTitle>Group settings</DialogTitle>
        <DialogContent>
          <Divider textAlign="left">Stream</Divider>
          <TextField
            // label="Stream"
            margin="dense"
            id="stream"
            select
            fullWidth
            variant="standard"
            value={streamId}
            onChange={(event) => {
              console.log("SetStream: " + event.target.value);
              setStreamId(event.target.value);
            }}
          >
            {props.server.streams.map((stream) => (
              <MenuItem key={stream.id} value={stream.id}>
                {stream.id.charAt(0).toUpperCase() + stream.id.slice(1)}
              </MenuItem>
            ))}
          </TextField>
          <Divider sx={{ paddingTop: 3, paddingBottom: 1 }} textAlign="left">
            Clients
          </Divider>
          <FormGroup>
            {clients.map((client) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={client.inGroup}
                    key={"cb-" + client.client.id}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleGroupClientChange(client.client, e.target.checked);
                    }}
                  />
                }
                label={client.client.getName()}
                key={"label-" + client.client.id}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleSettingsClose(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleSettingsClose(true);
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
      {snackbar()}
    </div>
  );
}

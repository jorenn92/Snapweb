import Group from "./Group";
import { SnapControl, Snapcast } from "../snapcontrol";
import { Box } from "@mui/material";
import { DragDropContext } from "react-beautiful-dnd";
import { useEffect, useRef, useState } from "react";
import _ from "lodash";

type ServerProps = {
  server: Snapcast.Server;
  snapcontrol: SnapControl;
  showOffline: boolean;
};

export default function Server(props: ServerProps) {
  let group = useRef<GroupObject[]>(
    props.server.groups.map((group) => (
      <Group
        group={group}
        key={group.id}
        server={props.server}
        snapcontrol={props.snapcontrol}
        showOffline={props.showOffline}
      />
    )) as unknown as GroupObject[]
  );

  group.current = props.server.groups.map((group) => (
    <Group
      group={group}
      key={group.id}
      server={props.server}
      snapcontrol={props.snapcontrol}
      showOffline={props.showOffline}
    />
  )) as unknown as GroupObject[];

  useEffect(() => {
    group.current = props.server.groups.map((group) => (
      <Group
        group={group}
        key={group.id}
        server={props.server}
        snapcontrol={props.snapcontrol}
        showOffline={props.showOffline}
      />
    )) as unknown as GroupObject[];
  }, [props.server, props.server.groups, props.showOffline, props.snapcontrol]);

  const reorder = (list: any, startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };

  const move = (
    source: GroupObject,
    destination: GroupObject,
    droppableSource: any,
    droppableDestination: any
  ) => {
    const sourceClone = _.cloneDeep(source);
    const destClone = _.cloneDeep(destination);
    const [removed] = sourceClone.props.group.clients.splice(
      droppableSource.index,
      1
    );

    destClone.props.group.clients.splice(
      droppableDestination.index,
      0,
      removed
    );

    const result = {};
    //@ts-ignore
    result[droppableSource.droppableId] = sourceClone;
    //@ts-ignore
    result[droppableDestination.droppableId] = destClone;

    return result;
  };

  function onDragEnd(result: { source: any; destination: any }) {
    const { source, destination } = result;

    // dropped outside the list
    if (!destination) {
      return;
    }
    const sInd = source.droppableId as String;
    const dInd = destination.droppableId as String;

    if (sInd === dInd) {
      let groupIndex = group.current.findIndex((el) => el.key === sInd);
      if (groupIndex !== -1) {
        const updatedGroup: GroupObject = _.cloneDeep(
          group.current[groupIndex]
        ) as unknown as GroupObject;
        updatedGroup.props.group.clients = reorder(
          updatedGroup.props.group.clients,
          source.index,
          destination.index
        ) as Client[];

        const newState = [...group.current] as unknown as GroupObject[];
        newState[groupIndex] = updatedGroup;
        group.current = newState;
        props.snapcontrol.setClients(
          updatedGroup.props.group.id,
          updatedGroup.props.group.clients.map((el) => el.id)
        );
      }
    } else {
      let groupIndexSource = group.current.findIndex((el) => el.key === sInd);
      let groupIndexDestination = group.current.findIndex(
        (el) => el.key === dInd
      );

      if (groupIndexSource !== -1 && groupIndexDestination !== -1) {
        const result = move(
          _.cloneDeep(
            group.current[groupIndexSource]
          ) as unknown as GroupObject,
          _.cloneDeep(
            group.current[groupIndexDestination]
          ) as unknown as GroupObject,
          source,
          destination
        );

        const newState = [...group.current];
        //@ts-ignore
        newState[groupIndexSource] = result[sInd];
        //@ts-ignore
        newState[groupIndexDestination] = result[dInd];
        group.current = newState;

        props.snapcontrol.setClients(
          //@ts-ignore
          result[sInd].props.group.id,
          //@ts-ignore
          result[sInd].props.group.clients.map((el) => el.id)
        );

        props.snapcontrol.setClients(
          //@ts-ignore
          result[dInd].props.group.id,
          //@ts-ignore
          result[dInd].props.group.clients.map((el) => el.id)
        );
      }
    }
  }

  return (
    <Box sx={{ m: 1.5 }}>
      <DragDropContext
        onDragEnd={onDragEnd}
        onDragStart={() => {
          if (window.navigator.vibrate) {
            window.navigator.vibrate(20);
          }
        }}
      >
        {group.current as unknown as JSX.Element[]}
      </DragDropContext>
    </Box>
  );
}

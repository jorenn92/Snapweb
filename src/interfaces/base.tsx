interface Client {
    id: string;
    host: {
      arch: string;
      ip: string;
      mac: string;
      name: string;
      os: string;
    };
    snapclient: {
      name: string;
      protocolVersion: number;
      version: string;
    };
    config: {
      instance: number;
      latency: number;
      name: string;
      volume: {
        muted: boolean;
        percent: number;
      };
    };
    lastSeen: {
      sec: number;
      usec: number;
    };
    connected: boolean;
  }
  
  interface Group {
    name: string;
    id: string;
    stream_id: string;
    muted: boolean;
    clients: Client[];
  }
  
  interface Host {
    arch: string;
    ip: string;
    mac: string;
    name: string;
    os: string;
  }
  
  interface Snapserver {
    controlProtocolVersion: number;
    name: string;
    protocolVersion: number;
    version: string;
  }
  
  interface Stream {
    id: string;
    status: string;
    uri: {
      raw: string;
      scheme: string;
      host: string;
      path: string;
      fragment: string;
      query: {
        buffer: string;
        chunk_ms: string;
        codec: string;
        name: string;
        sampleformat: string;
      };
    };
    properties: {
      canGoNext: boolean;
      canGoPrevious: boolean;
      canPlay: boolean;
      canPause: boolean;
      canSeek: boolean;
      canControl: boolean;
      metadata: Record<string, any>;
    };
  }
  
  interface Server {
    groups: Group[];
    host: Host;
    snapserver: Snapserver;
    streams: Stream[];
  }
  
  interface Snapcontrol {
    baseUrl: string;
    connection: Record<string, any>;
    server: Server;
    msg_id: number;
    status_req_id: number;
  }
  
  interface GroupObject {
    key: string;
    ref: any;
    props: {
      group: Group;
      server: Server;
      snapcontrol: Snapcontrol;
      showOffline: boolean;
    };
    _owner: any;
    _store: Record<string, any>;
  }
  
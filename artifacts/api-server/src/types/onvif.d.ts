declare module "onvif" {
  import { EventEmitter } from "events";

  interface CamOptions {
    hostname: string;
    port?: number;
    path?: string;
    username?: string;
    password?: string;
    timeout?: number;
    preserveAddress?: boolean;
    useSecure?: boolean;
  }

  interface OnvifSimpleItem {
    $: { Name: string; Value: string };
  }

  interface OnvifMessage {
    topic?: { _?: string };
    message?: {
      message?: {
        $?: { UtcTime?: string };
        data?: {
          simpleItem?: OnvifSimpleItem | OnvifSimpleItem[];
        };
      };
    };
  }

  class Cam extends EventEmitter {
    constructor(options: CamOptions, callback?: (this: Cam, error: Error | null) => void);
    on(event: "event", listener: (message: OnvifMessage, xml?: string) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    getSystemDateAndTime(callback: (err: Error | null, date: Date) => void): void;
  }

  export { Cam, CamOptions, OnvifMessage, OnvifSimpleItem };
}

import { useEffect, useRef, useState } from "react";

const NINTENDO_VENDOR_ID = 0x057e;
const UNITY_BRIDGE_OBJECT = "JoyConWebBridge";
const JOYCON_OUTPUT_REPORT_ID = 0x01;
const JOYCON_STANDARD_FULL_MODE = 0x30;
const JOYCON_STANDARD_FULL_MODE_ALT = 0x31;
const JOYCON_SUBCOMMAND_SET_INPUT_REPORT_MODE = 0x03;
const JOYCON_SUBCOMMAND_ENABLE_IMU = 0x40;
const JOYCON_RIGHT_BUTTON_BYTE_INDEX = 1;
const JOYCON_SHARED_BUTTON_BYTE_INDEX = 2;
const JOYCON_LEFT_BUTTON_BYTE_INDEX = 3;
const JOYCON_ZR_BITMASK = 0b10000000;
const JOYCON_RUMBLE_NEUTRAL = [0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40];
const JOYCON_MOTION_SAMPLE_SIZE = 12;
const JOYCON_MOTION_BLOCK_OFFSET = 12;

export interface UnityGameEmbedProps {
  loaderUrl?: string;
  dataUrl?: string;
  frameworkUrl?: string;
  codeUrl?: string;
}

interface MotionPayload {
  gx: number;
  gy: number;
  gz: number;
  ax: number;
  ay: number;
  az: number;
  sx: number;
  sy: number;
}

type InputReportHandler = (event: HIDInputReportEvent) => void;
type BridgeMethod = "OnJoyConStatus" | "OnZRDown" | "OnZRUp" | "OnMotion";

function unityShowBanner(message: string, type: "warning" | "error" | "log" = "log"): void {
  if (type === "error") {
    console.error(`[Unity] ${message}`);
    return;
  }

  if (type === "warning") {
    console.warn(`[Unity] ${message}`);
    return;
  }

  console.log(`[Unity] ${message}`);
}

function readInt16LE(bytes: Uint8Array, index: number): number {
  if (index + 1 >= bytes.length) {
    return 0;
  }

  const value = bytes[index] | (bytes[index + 1] << 8);
  return value >= 0x8000 ? value - 0x10000 : value;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSubcommandPacket(
  packetNumber: number,
  subcommand: number,
  data: number[] = [],
): Uint8Array {
  return new Uint8Array([
    packetNumber & 0x0f,
    ...JOYCON_RUMBLE_NEUTRAL,
    subcommand,
    ...data,
  ]);
}

function extractMotionPayload(bytes: Uint8Array): MotionPayload | null {
  if (bytes.length < JOYCON_MOTION_BLOCK_OFFSET + JOYCON_MOTION_SAMPLE_SIZE) {
    return null;
  }

  const accelStart = JOYCON_MOTION_BLOCK_OFFSET;
  const gyroStart = accelStart + 6;

  const axRaw = readInt16LE(bytes, accelStart);
  const ayRaw = readInt16LE(bytes, accelStart + 2);
  const azRaw = readInt16LE(bytes, accelStart + 4);

  const gxRaw = readInt16LE(bytes, gyroStart);
  const gyRaw = readInt16LE(bytes, gyroStart + 2);
  const gzRaw = readInt16LE(bytes, gyroStart + 4);

  return {
    gx: gxRaw / 1024,
    gy: gyRaw / 1024,
    gz: gzRaw / 1024,
    ax: axRaw / 4096,
    ay: ayRaw / 4096,
    az: azRaw / 4096,
    sx: 0,
    sy: 0,
  };
}

function readHidBytes(data: DataView): Uint8Array {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function formatButtonBytes(bytes: Uint8Array): string {
  const buttonBytes = [
    bytes[JOYCON_RIGHT_BUTTON_BYTE_INDEX],
    bytes[JOYCON_SHARED_BUTTON_BYTE_INDEX],
    bytes[JOYCON_LEFT_BUTTON_BYTE_INDEX],
  ]
    .map((value) => `0x${(value ?? 0).toString(16).padStart(2, "0")}`)
    .join(" ");

  return `Buttons: ${buttonBytes}`;
}

function extractZRPressed(bytes: Uint8Array, productName = ""): boolean {
  const normalizedName = productName.toLowerCase();
  const buttonBytes = [
    bytes[JOYCON_RIGHT_BUTTON_BYTE_INDEX] ?? 0,
    bytes[JOYCON_SHARED_BUTTON_BYTE_INDEX] ?? 0,
    bytes[JOYCON_LEFT_BUTTON_BYTE_INDEX] ?? 0,
  ];

  if (normalizedName.includes("left")) {
    return false;
  }

  if (normalizedName.includes("pro controller")) {
    return buttonBytes.some((value) => (value & JOYCON_ZR_BITMASK) !== 0);
  }

  return (
    (buttonBytes[0] & JOYCON_ZR_BITMASK) !== 0 ||
    (buttonBytes[1] & JOYCON_ZR_BITMASK) !== 0
  );
}

function isMotionReport(event: HIDInputReportEvent): boolean {
  return (
    event.reportId === JOYCON_STANDARD_FULL_MODE ||
    event.reportId === JOYCON_STANDARD_FULL_MODE_ALT
  );
}

function UnityGameEmbed({
  loaderUrl = "/Build/BuildPrototipo3.loader.js",
  dataUrl = "/Build/BuildPrototipo3.data",
  frameworkUrl = "/Build/BuildPrototipo3.framework.js",
  codeUrl = "/Build/BuildPrototipo3.wasm",
}: UnityGameEmbedProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const unityInstanceRef = useRef<UnityInstance | null>(null);
  const deviceRef = useRef<HIDDevice | null>(null);
  const reportHandlerRef = useRef<InputReportHandler | null>(null);
  const bridgeSyncIntervalRef = useRef<number | null>(null);
  const zrSyncIntervalRef = useRef<number | null>(null);
  const packetNumberRef = useRef(0);
  const isZRPressedRef = useRef(false);
  const mountedRef = useRef(true);
  const isUnityLoadedRef = useRef(false);
  const latestJoyConStatusRef = useRef<"connected" | "disconnected">("disconnected");
  const latestMotionPayloadRef = useRef<MotionPayload | null>(null);
  const pendingBridgeMessagesRef = useRef<Map<BridgeMethod, string>>(new Map());

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isUnityLoaded, setIsUnityLoaded] = useState(false);
  const [unityStatus, setUnityStatus] = useState("Loading Unity build...");
  const [unityError, setUnityError] = useState("");
  const [joyConStatus, setJoyConStatus] = useState("Joy-Con not connected");
  const [bridgeStatus, setBridgeStatus] = useState("Bridge idle");
  const [bridgeMotionStatus, setBridgeMotionStatus] = useState("No motion events yet");
  const [bridgeButtonStatus, setBridgeButtonStatus] = useState("No button events yet");
  const [bridgeError, setBridgeError] = useState("");
  const [reportCount, setReportCount] = useState(0);
  const [zrStateLabel, setZrStateLabel] = useState("ZR: up");
  const [motionStatus, setMotionStatus] = useState("IMU idle");
  const [buttonBytesLabel, setButtonBytesLabel] = useState("Buttons: -- -- --");

  const hasWebHid = typeof navigator !== "undefined" && Boolean(navigator.hid);

  function updateState<T>(setter: React.Dispatch<React.SetStateAction<T>>, value: React.SetStateAction<T>) {
    if (mountedRef.current) {
      setter(value);
    }
  }

  function getControlStatusLabel(): string {
    const s = joyConStatus.toLowerCase();
    const looksConnected =
      s.includes("connected:") ||
      (s.includes("connected") &&
        !s.includes("not connected") &&
        !s.includes("disconnected") &&
        !s.includes("could not connect"));
    if (looksConnected) {
      return "IOT CONTROL: CONNECTED";
    }
    if (s.includes("connecting")) {
      return "IOT CONTROL: CONNECTING";
    }
    return "IOT CONTROL: NOT CONNECTED";
  }

  function safeSendToUnity(method: string, payload = ""): boolean {
    const unityInstance = unityInstanceRef.current;
    const statusMessage = `Sent -> ${UNITY_BRIDGE_OBJECT}.${method}`;

    if (!unityInstance || !isUnityLoadedRef.current) {
      updateState(setBridgeStatus, `Unity not loaded (attempting ${method})`);
      return false;
    }

    try {
      unityInstance.SendMessage(UNITY_BRIDGE_OBJECT, method, payload);
      updateState(setBridgeStatus, statusMessage);
      if (method === "OnMotion") {
        updateState(setBridgeMotionStatus, statusMessage);
      } else {
        updateState(setBridgeButtonStatus, statusMessage);
      }
      updateState(setBridgeError, "");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateState(setBridgeStatus, "Bridge error");
      updateState(
        setBridgeError,
        `Error bridge ${UNITY_BRIDGE_OBJECT}.${method}: ${message}`,
      );
      return false;
    }
  }

  function queueBridgeMessage(method: BridgeMethod, payload = ""): void {
    pendingBridgeMessagesRef.current.set(method, payload);
  }

  function flushBridgeQueue(): void {
    if (!isUnityLoadedRef.current || pendingBridgeMessagesRef.current.size === 0) {
      return;
    }

    for (const [method, payload] of pendingBridgeMessagesRef.current.entries()) {
      if (safeSendToUnity(method, payload)) {
        pendingBridgeMessagesRef.current.delete(method);
      }
    }
  }

  function syncBridgeState(): void {
    queueBridgeMessage("OnJoyConStatus", latestJoyConStatusRef.current);

    if (isZRPressedRef.current) {
      queueBridgeMessage("OnZRDown", "sync");
      pendingBridgeMessagesRef.current.delete("OnZRUp");
    } else {
      queueBridgeMessage("OnZRUp", "sync");
      pendingBridgeMessagesRef.current.delete("OnZRDown");
    }

    if (latestMotionPayloadRef.current) {
      queueBridgeMessage("OnMotion", JSON.stringify(latestMotionPayloadRef.current));
    }

    flushBridgeQueue();
  }

  function clearZrSyncLoop(): void {
    if (zrSyncIntervalRef.current !== null) {
      window.clearInterval(zrSyncIntervalRef.current);
      zrSyncIntervalRef.current = null;
    }
  }

  function startZrSyncLoop(): void {
    clearZrSyncLoop();
    zrSyncIntervalRef.current = window.setInterval(() => {
      if (!mountedRef.current || !isUnityLoadedRef.current) {
        return;
      }

      if (isZRPressedRef.current) {
        safeSendToUnity("OnZRDown", "hold");
      }
    }, 150);
  }

  function clearBridgeSyncLoop(): void {
    if (bridgeSyncIntervalRef.current !== null) {
      window.clearInterval(bridgeSyncIntervalRef.current);
      bridgeSyncIntervalRef.current = null;
    }
  }

  function startBridgeSyncLoop(): void {
    clearBridgeSyncLoop();
    bridgeSyncIntervalRef.current = window.setInterval(() => {
      if (!mountedRef.current) {
        return;
      }

      syncBridgeState();
    }, 250);
  }

  async function sendJoyConSubcommand(
    device: HIDDevice,
    subcommand: number,
    data: number[] = [],
  ): Promise<void> {
    const packet = createSubcommandPacket(packetNumberRef.current, subcommand, data);
    packetNumberRef.current = (packetNumberRef.current + 1) % 16;
    await device.sendReport(JOYCON_OUTPUT_REPORT_ID, packet);
  }

  async function initializeJoyConMotion(device: HIDDevice): Promise<void> {
    updateState(setMotionStatus, "Initializing IMU...");
    await sendJoyConSubcommand(device, JOYCON_SUBCOMMAND_ENABLE_IMU, [0x01]);
    await wait(50);
    await sendJoyConSubcommand(
      device,
      JOYCON_SUBCOMMAND_SET_INPUT_REPORT_MODE,
      [JOYCON_STANDARD_FULL_MODE],
    );
    await wait(50);
    updateState(setMotionStatus, "IMU active");
  }

  async function disconnectJoyCon(): Promise<void> {
    const device = deviceRef.current;
    const handler = reportHandlerRef.current;

    if (device && handler) {
      device.removeEventListener("inputreport", handler);
    }

    if (device?.opened) {
      await device.close();
    }

    deviceRef.current = null;
    reportHandlerRef.current = null;
    isZRPressedRef.current = false;
    latestJoyConStatusRef.current = "disconnected";
    latestMotionPayloadRef.current = null;
    clearZrSyncLoop();
    clearBridgeSyncLoop();

    updateState(setJoyConStatus, "Joy-Con disconnected");
    updateState(setReportCount, 0);
    updateState(setZrStateLabel, "ZR: up");
    updateState(setMotionStatus, "IMU idle");
    updateState(setButtonBytesLabel, "Buttons: -- -- --");
    updateState(setBridgeMotionStatus, "No motion events yet");
    updateState(setBridgeButtonStatus, "No button events yet");
    syncBridgeState();
  }

  async function connectJoyCon(): Promise<void> {
    if (!hasWebHid) {
      updateState(setJoyConStatus, "WebHID is not supported in this browser");
      return;
    }

    try {
      updateState(setJoyConStatus, "Connecting");
      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: NINTENDO_VENDOR_ID }],
      });

      if (!devices.length) {
        updateState(setJoyConStatus, "No Joy-Con was selected");
        return;
      }

      const device = devices[0];
      await device.open();
      packetNumberRef.current = 0;
      latestJoyConStatusRef.current = "connected";
      await initializeJoyConMotion(device);
      startZrSyncLoop();
      startBridgeSyncLoop();

      const onInputReport: InputReportHandler = (event) => {
        if (!isMotionReport(event)) {
          return;
        }

        const bytes = readHidBytes(event.data);
        const reportId = event.reportId ?? JOYCON_STANDARD_FULL_MODE;

        updateState(setReportCount, (previous) => previous + 1);
        updateState(
          setMotionStatus,
          `Receiving reports 0x${reportId.toString(16)}`,
        );
        updateState(setButtonBytesLabel, formatButtonBytes(bytes));

        const nowZRPressed = extractZRPressed(bytes, device.productName);
        const wasZRPressed = isZRPressedRef.current;

        if (!wasZRPressed && nowZRPressed) {
          safeSendToUnity("OnZRDown");
          updateState(setZrStateLabel, "ZR: down");
        }

        if (wasZRPressed && !nowZRPressed) {
          safeSendToUnity("OnZRUp");
          updateState(setZrStateLabel, "ZR: up");
        }

        isZRPressedRef.current = nowZRPressed;

        const motion = extractMotionPayload(bytes);
        if (motion) {
          latestMotionPayloadRef.current = motion;
          syncBridgeState();
        }
      };

      device.addEventListener("inputreport", onInputReport);

      deviceRef.current = device;
      reportHandlerRef.current = onInputReport;

      updateState(
        setJoyConStatus,
        `Joy-Con connected: ${device.productName || "Nintendo HID"}`,
      );
      updateState(setBridgeStatus, "Bridge ready to send data");
      updateState(setBridgeMotionStatus, "No motion events yet");
      updateState(setBridgeButtonStatus, "No button events yet");
      updateState(setBridgeError, "");
      syncBridgeState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      updateState(setJoyConStatus, `Could not connect Joy-Con: ${message}`);
      updateState(setBridgeError, `WebHID error: ${message}`);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    const script = document.createElement("script");
    script.src = loaderUrl;
    script.async = true;

    script.onload = async () => {
      try {
        if (!window.createUnityInstance || !canvasRef.current) {
          throw new Error("createUnityInstance was not found in the Unity loader.");
        }

        const unityInstance = await window.createUnityInstance(
          canvasRef.current,
          {
            arguments: [],
            dataUrl,
            frameworkUrl,
            codeUrl,
            streamingAssetsUrl: "StreamingAssets",
            companyName: "DefaultCompany",
            productName: "Prototipo",
            productVersion: "0.1.0-web-bridge-fix-1",
            showBanner: unityShowBanner,
          },
          (progress) => {
            updateState(setLoadingProgress, progress);
            updateState(
              setUnityStatus,
              `Loading Unity build... ${Math.round(progress * 100)}%`,
            );
          },
        );

        unityInstanceRef.current = unityInstance;
        isUnityLoadedRef.current = true;
        updateState(setIsUnityLoaded, true);
        updateState(setUnityStatus, "Unity ready");
        updateState(setUnityError, "");
        startBridgeSyncLoop();

        if (deviceRef.current?.opened) {
          syncBridgeState();
          startZrSyncLoop();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        updateState(setUnityStatus, "Could not load Unity");
        updateState(setUnityError, message);
      }
    };

    script.onerror = () => {
      updateState(setUnityStatus, "Could not load the Unity loader");
      updateState(
        setUnityError,
        "Make sure the BuildPrototipo3.* files exist under apps/web/public/Build.",
      );
    };

    document.body.appendChild(script);

    return () => {
      mountedRef.current = false;
      isUnityLoadedRef.current = false;
      clearBridgeSyncLoop();
      clearZrSyncLoop();

      void disconnectJoyCon();

      const unityInstance = unityInstanceRef.current;
      if (unityInstance?.Quit) {
        void unityInstance.Quit();
      }

      unityInstanceRef.current = null;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [loaderUrl, dataUrl, frameworkUrl, codeUrl]);

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4 rounded-[18px] border border-[#d8dee5] bg-[#f5f8fb] p-4 max-[900px]:flex-col">
        <div className="grid gap-0.5">
          <p className="mb-1.5 font-bold text-[#0b2a55]">{getControlStatusLabel()}</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className="cursor-pointer rounded-full border-0 bg-[#0f3d78] px-[18px] py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void connectJoyCon()}
            disabled={!hasWebHid}
          >
            Connect Joy-Con
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-full border border-[#b7c4d1] bg-white px-[18px] py-3 text-sm font-bold text-[#28415a]"
            onClick={() => void disconnectJoyCon()}
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="relative min-h-[560px] overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(214,40,57,0.2),transparent_24%),linear-gradient(180deg,#07162d_0%,#050b15_100%)] max-[900px]:min-h-[420px]">
        {!isUnityLoaded ? (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-[rgba(5,11,21,0.78)] backdrop-blur-[6px]">
            <div className="w-[min(360px,calc(100%-40px))] text-white">
              <p className="mb-3 text-center font-bold">{unityStatus}</p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.15)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#d62839_0%,#ff9e5e_100%)] transition-[width] duration-180 ease-in-out"
                  style={{ width: `${Math.round(loadingProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <canvas
          ref={canvasRef}
          id="unity-canvas"
          className="block min-h-[560px] w-full border-0 max-[900px]:min-h-[420px]"
          width="960"
          height="600"
          tabIndex={-1}
        />
      </div>

    </div>
  );
}

export default UnityGameEmbed;

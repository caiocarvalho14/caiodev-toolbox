import { initLogger } from "./logger";
import { initNetworkMonitor } from "./network";

initLogger();         // primeiro, para capturar os avisos de online/offline
initNetworkMonitor();
import type { WASocket } from "@whiskeysockets/baileys";

let _socket: WASocket | null = null;

export function setSocket(sock: WASocket | null) { _socket = sock; }
export function getSocket(): WASocket | null { return _socket; }

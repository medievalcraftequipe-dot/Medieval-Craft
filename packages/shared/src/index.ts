export type PlatformPermission =
  | "ADMINISTRATOR"
  | "MANAGE_SERVER"
  | "MANAGE_CHANNELS"
  | "MANAGE_ROLES"
  | "KICK_MEMBERS"
  | "BAN_MEMBERS"
  | "MANAGE_MESSAGES"
  | "DELETE_MESSAGES"
  | "CREATE_INVITES"
  | "CHANGE_NICKNAME"
  | "MANAGE_NICKNAMES"
  | "MENTION_EVERYONE"
  | "SEND_FILES"
  | "USE_CAMERA"
  | "SHARE_SCREEN"
  | "JOIN_VOICE"
  | "SPEAK"
  | "MUTE_MEMBERS"
  | "MOVE_MEMBERS"
  | "CREATE_EVENTS";

export const PLATFORM_PERMISSIONS: PlatformPermission[] = [
  "ADMINISTRATOR",
  "MANAGE_SERVER",
  "MANAGE_CHANNELS",
  "MANAGE_ROLES",
  "KICK_MEMBERS",
  "BAN_MEMBERS",
  "MANAGE_MESSAGES",
  "DELETE_MESSAGES",
  "CREATE_INVITES",
  "CHANGE_NICKNAME",
  "MANAGE_NICKNAMES",
  "MENTION_EVERYONE",
  "SEND_FILES",
  "USE_CAMERA",
  "SHARE_SCREEN",
  "JOIN_VOICE",
  "SPEAK",
  "MUTE_MEMBERS",
  "MOVE_MEMBERS",
  "CREATE_EVENTS"
];

export function hasPermission(
  granted: Iterable<PlatformPermission>,
  permission: PlatformPermission
): boolean {
  const permissionSet = new Set(granted);
  return permissionSet.has("ADMINISTRATOR") || permissionSet.has(permission);
}

export type TutorAvatarCustomization = {
  bodyColor: string;
  headbandColor: string;
  hijabColor: string;
};

export const DEFAULT_TUTOR_AVATAR_CUSTOMIZATION: TutorAvatarCustomization = {
  bodyColor: "#FFFFFF",
  headbandColor: "#FFFFFF",
  hijabColor: "#F9B129",
};

export const TUTOR_AVATAR_CUSTOMIZATION_STORAGE_KEY =
  "tutor-avatar-customization";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function isTutorAvatarCustomization(
  value: unknown
): value is TutorAvatarCustomization {
  if (!value || typeof value !== "object") return false;

  const customization = value as Partial<TutorAvatarCustomization>;
  return (
    typeof customization.bodyColor === "string" &&
    HEX_COLOR_PATTERN.test(customization.bodyColor) &&
    typeof customization.headbandColor === "string" &&
    HEX_COLOR_PATTERN.test(customization.headbandColor) &&
    typeof customization.hijabColor === "string" &&
    HEX_COLOR_PATTERN.test(customization.hijabColor)
  );
}

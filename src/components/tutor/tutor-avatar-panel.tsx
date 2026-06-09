"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  type AnimationAction,
  AnimationMixer,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  TextureLoader,
  type AnimationClip,
  type Group,
  type Material,
  type Texture,
} from "three";
import { Loader2 } from "lucide-react";

import type { TutorAvatarCustomization } from "./tutor-avatar-customization";
import type { TutorChatSession, TutorMessage } from "./tutor-chat-types";

const AVATAR_ASSET_VERSION = "20260607-4";

function avatarAssetPath(path: string) {
  return `${path}?v=${AVATAR_ASSET_VERSION}`;
}

const AVATAR_MODEL_PATH = avatarAssetPath("/modelavatar/ModelMuslim.glb");
const BODY_TEXTURE_PATH = avatarAssetPath("/modelavatar/BodyTexture.png");
const HAND_TEXTURE_PATH = avatarAssetPath("/modelavatar/HandTexture.png");
const FOOT_TEXTURE_PATH = avatarAssetPath("/modelavatar/FootTexture.png");
const HEADBAND_TEXTURE_PATH = avatarAssetPath("/modelavatar/HeadbandTexture.png");
const HIJAB_TEXTURE_PATH = avatarAssetPath("/modelavatar/HijabTexture.png");
const NORMAL_FACE_TEXTURE_PATH = avatarAssetPath("/modelavatar/NormalFaceExpressionTexture.png");
const TALK_FACE_TEXTURE_PATH = avatarAssetPath("/modelavatar/TalkFaceExpressionTexture.png");
const HAPPY_FACE_TEXTURE_PATH = avatarAssetPath("/modelavatar/HappyFaceExpressionTexture.png");
const SAD_FACE_TEXTURE_PATH = avatarAssetPath("/modelavatar/SadFaceExpressionTexture.png");
const THINK_FACE_TEXTURE_PATH = avatarAssetPath("/modelavatar/ThinkFaceExpressionTexture.png");
const AVATAR_MODEL_SCALE = 0.5;
const AVATAR_MODEL_POSITION: [number, number, number] = [0, 0.68, 0];

type AvatarExpression = "neutral" | "speaking" | "happy" | "concerned" | "thinking";
type AvatarAnimationMode = "idle" | "thinking" | "talking";
type BrowserAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

type TutorAvatarPanelProps = {
  activeSession: TutorChatSession | null;
  customization: TutorAvatarCustomization;
  courseId: string;
  loadingSession: boolean;
  sending: boolean;
  recording: boolean;
  transcribing: boolean;
};

type AvatarMaterials = {
  body: MeshStandardMaterial;
  face: MeshStandardMaterial;
  foot: MeshStandardMaterial;
  hand: MeshStandardMaterial;
  headband: MeshStandardMaterial;
  hijab: MeshStandardMaterial;
  skin: MeshStandardMaterial;
};

type LoadedAvatarAssets = {
  animations: AnimationClip[];
  scene: Object3D;
  bodyTexture: Texture;
  faceTextures: Record<AvatarExpression, Texture>;
  footTexture: Texture;
  handTexture: Texture;
  headbandTexture: Texture;
  hijabTexture: Texture;
};

function isMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh === true;
}

function loadGltf(loader: GLTFLoader, path: string) {
  return new Promise<GLTF>((resolve, reject) => {
    loader.load(path, resolve, undefined, reject);
  });
}

function loadTexture(loader: TextureLoader, path: string) {
  return new Promise<Texture>((resolve, reject) => {
    loader.load(path, resolve, undefined, reject);
  });
}

function prepareColorTexture(texture: Texture, maxAnisotropy: number) {
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.needsUpdate = true;
}

function pickAvatarMaterial(
  meshName: string,
  materialName: string | undefined,
  materials: AvatarMaterials
): Material {
  const mesh = meshName.toLowerCase();
  const material = (materialName ?? "").toLowerCase();

  if (mesh === "circle" || material === "material.009") return materials.hijab;
  if (mesh === "cylinder.003" || material === "material.007") return materials.foot;
  if (mesh === "cylinder.004") return materials.hand;
  if (
    mesh === "sphere.002" ||
    material === "material.005"
  ) {
    return materials.headband;
  }
  if (mesh === "sphere.003" || material === "material.010") return materials.face;
  if (
    mesh === "cylinder.002" ||
    material === "material.008"
  ) {
    return materials.body;
  }

  return materials.skin;
}

function getFaceTexture(textures: LoadedAvatarAssets["faceTextures"], expression: AvatarExpression) {
  return textures[expression];
}

function getAnimationClip(animations: AnimationClip[], name: string) {
  return animations.find((animation) => animation.name === name) ?? null;
}

function AvatarModel({
  animationMode,
  customization,
  expression,
  onReady,
  speaking,
}: {
  animationMode: AvatarAnimationMode;
  customization: TutorAvatarCustomization;
  expression: AvatarExpression;
  onReady: (ready: boolean) => void;
  speaking: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const animationMixerRef = useRef<AnimationMixer | null>(null);
  const activeAnimationActionRef = useRef<AnimationAction | null>(null);
  const faceMaterialRef = useRef<MeshStandardMaterial | null>(null);
  const expressionRef = useRef(expression);
  const speakingRef = useRef(speaking);
  const [assets, setAssets] = useState<LoadedAvatarAssets | null>(null);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    let cancelled = false;
    const gltfLoader = new GLTFLoader();
    const textureLoader = new TextureLoader();

    Promise.all([
      loadGltf(gltfLoader, AVATAR_MODEL_PATH),
      loadTexture(textureLoader, BODY_TEXTURE_PATH),
      loadTexture(textureLoader, HAND_TEXTURE_PATH),
      loadTexture(textureLoader, FOOT_TEXTURE_PATH),
      loadTexture(textureLoader, HEADBAND_TEXTURE_PATH),
      loadTexture(textureLoader, HIJAB_TEXTURE_PATH),
      loadTexture(textureLoader, NORMAL_FACE_TEXTURE_PATH),
      loadTexture(textureLoader, TALK_FACE_TEXTURE_PATH),
      loadTexture(textureLoader, HAPPY_FACE_TEXTURE_PATH),
      loadTexture(textureLoader, SAD_FACE_TEXTURE_PATH),
      loadTexture(textureLoader, THINK_FACE_TEXTURE_PATH),
    ])
      .then(([
        gltf,
        bodyTexture,
        handTexture,
        footTexture,
        headbandTexture,
        hijabTexture,
        normalFaceTexture,
        talkFaceTexture,
        happyFaceTexture,
        sadFaceTexture,
        thinkFaceTexture,
      ]) => {
        if (cancelled) return;

        const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

        [
          bodyTexture,
          handTexture,
          footTexture,
          headbandTexture,
          hijabTexture,
          normalFaceTexture,
          talkFaceTexture,
          happyFaceTexture,
          sadFaceTexture,
          thinkFaceTexture,
        ].forEach((texture) => prepareColorTexture(texture, maxAnisotropy));

        setAssets({
          animations: gltf.animations,
          scene: gltf.scene,
          bodyTexture,
          handTexture,
          faceTextures: {
            neutral: normalFaceTexture,
            speaking: talkFaceTexture,
            happy: happyFaceTexture,
            concerned: sadFaceTexture,
            thinking: thinkFaceTexture,
          },
          footTexture,
          headbandTexture,
          hijabTexture,
        });
        onReady(true);
      })
      .catch(() => {
        if (!cancelled) onReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gl, onReady]);

  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  const materials = useMemo<AvatarMaterials | null>(() => {
    if (!assets) return null;

    return {
      body: new MeshStandardMaterial({
        map: assets.bodyTexture,
        metalness: 0,
        roughness: 0.72,
        side: DoubleSide,
      }),
      face: new MeshStandardMaterial({
        map: assets.faceTextures.neutral,
        metalness: 0,
        roughness: 0.66,
        side: DoubleSide,
      }),
      foot: new MeshStandardMaterial({
        map: assets.footTexture,
        metalness: 0,
        roughness: 0.78,
        side: DoubleSide,
      }),
      hand: new MeshStandardMaterial({
        map: assets.handTexture,
        metalness: 0,
        roughness: 0.86,
        side: DoubleSide,
      }),
      headband: new MeshStandardMaterial({
        map: assets.headbandTexture,
        metalness: 0,
        roughness: 0.78,
        side: DoubleSide,
      }),
      hijab: new MeshStandardMaterial({
        map: assets.hijabTexture,
        metalness: 0,
        roughness: 0.82,
        side: DoubleSide,
      }),
      skin: new MeshStandardMaterial({
        color: new Color("#e8c88d"),
        metalness: 0,
        roughness: 0.86,
        side: DoubleSide,
      }),
    };
  }, [assets]);

  useEffect(() => {
    if (!materials) return;

    materials.body.color.set(customization.bodyColor);
    materials.headband.color.set(customization.headbandColor);
    materials.hijab.color.set(customization.hijabColor);
  }, [customization, materials]);

  useEffect(() => {
    faceMaterialRef.current = materials?.face ?? null;
  }, [materials]);

  useEffect(() => {
    if (!assets || assets.animations.length === 0) {
      animationMixerRef.current = null;
      return;
    }

    const mixer = new AnimationMixer(assets.scene);
    animationMixerRef.current = mixer;

    return () => {
      mixer.stopAllAction();
      activeAnimationActionRef.current = null;
      animationMixerRef.current = null;
    };
  }, [assets]);

  useEffect(() => {
    const mixer = animationMixerRef.current;
    if (!assets || !mixer) return;

    const idleClip = getAnimationClip(assets.animations, "IdleAnim");
    const sequence =
      animationMode === "thinking"
        ? {
            intro: getAnimationClip(assets.animations, "ThinkAnim"),
            loop: getAnimationClip(assets.animations, "IdleThink"),
          }
        : animationMode === "talking"
          ? {
              intro: getAnimationClip(assets.animations, "TalkAnim"),
              loop: getAnimationClip(assets.animations, "TalkIdleAnim"),
            }
          : { intro: null, loop: idleClip };

    const loopClip = sequence.loop ?? idleClip;
    if (!loopClip) {
      console.warn("[avatar-animation] Clip IdleAnim tidak ditemukan.");
      return;
    }

    function playAction(action: AnimationAction, loop: boolean) {
      const previousAction = activeAnimationActionRef.current;
      if (previousAction && previousAction !== action) {
        previousAction.fadeOut(0.18);
      }

      action.reset();
      action.enabled = true;
      action.clampWhenFinished = !loop;
      action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
      action.fadeIn(0.18).play();
      activeAnimationActionRef.current = action;
    }

    const loopAction = mixer.clipAction(loopClip);
    const introAction = sequence.intro
      ? mixer.clipAction(sequence.intro)
      : null;

    if (!introAction) {
      playAction(loopAction, true);
      return () => {
        loopAction.fadeOut(0.12);
      };
    }

    function handleAnimationFinished(event: { action: AnimationAction }) {
      if (event.action !== introAction) return;
      playAction(loopAction, true);
    }

    mixer.addEventListener("finished", handleAnimationFinished);
    playAction(introAction, false);

    return () => {
      mixer.removeEventListener("finished", handleAnimationFinished);
      introAction.fadeOut(0.12);
      loopAction.fadeOut(0.12);
    };
  }, [animationMode, assets]);

  useLayoutEffect(() => {
    if (!assets || !materials) return;

    assets.scene.traverse((object) => {
      if (!isMesh(object)) return;

      object.frustumCulled = false;

      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) =>
          pickAvatarMaterial(object.name, material.name, materials)
        );
      } else {
        object.material = pickAvatarMaterial(object.name, object.material.name, materials);
      }
    });
  }, [assets, materials]);

  useFrame(({ clock }, delta) => {
    if (!assets || !groupRef.current) return;

    const elapsed = clock.getElapsedTime();
    animationMixerRef.current?.update(delta);
    const activeExpression =
      speakingRef.current && Math.floor(elapsed * 7) % 2 === 0
        ? "speaking"
        : speakingRef.current
          ? "neutral"
          : expressionRef.current;

    const faceMaterial = faceMaterialRef.current;
    if (faceMaterial) {
      const nextFaceTexture = getFaceTexture(assets.faceTextures, activeExpression);
      if (faceMaterial.map !== nextFaceTexture) {
        faceMaterial.map = nextFaceTexture;
        faceMaterial.needsUpdate = true;
      }
    }
    const breathingScale = 1 + Math.sin(elapsed * 1.05) * 0.012;
    groupRef.current.rotation.y = Math.sin(elapsed * 0.45) * 0.012;
    groupRef.current.position.y = -0.2;
    groupRef.current.scale.set(1 + (breathingScale - 1) * 0.05, breathingScale, 1);
  });

  if (!assets || !materials) return null;

  return (
    <group ref={groupRef}>
      <primitive
        object={assets.scene}
        scale={AVATAR_MODEL_SCALE}
        position={AVATAR_MODEL_POSITION}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

function AvatarStage({
  animationMode,
  customization,
  expression,
  onReady,
  speaking,
}: {
  animationMode: AvatarAnimationMode;
  customization: TutorAvatarCustomization;
  expression: AvatarExpression;
  onReady: (ready: boolean) => void;
  speaking: boolean;
}) {
  return (
    <>
      <ambientLight intensity={2} />
      <directionalLight intensity={2} position={[3.5, 10, 4]} />
      <directionalLight intensity={2} position={[-4, 2.5, -2]} />
      <group position={[0, 0, 0]}>
        <AvatarModel
          animationMode={animationMode}
          customization={customization}
          expression={expression}
          onReady={onReady}
          speaking={speaking}
        />
      </group>
    </>
  );
}

function getAvatarExpression({
  activeSession,
  loadingSession,
  recording,
  transcribing,
}: TutorAvatarPanelProps, animationMode: AvatarAnimationMode): AvatarExpression {
  if (animationMode === "thinking") return "thinking";
  if (loadingSession) return "neutral";
  if (recording) return "happy";
  if (transcribing) return "concerned";

  return getLatestAiAvatarExpression(activeSession);
}

function getLatestAiMessage(session: TutorChatSession | null) {
  return session?.messages
    .slice()
    .reverse()
    .find((message) => message.senderType === "ai" && message.content.trim());
}

function isAvatarAiMessage(message: TutorMessage | null | undefined) {
  if (!message?.ragSources || typeof message.ragSources !== "object") {
    return false;
  }

  const metadata = message.ragSources as {
    responseMode?: unknown;
    spokenText?: unknown;
  };

  if (metadata.responseMode === "avatar") return true;
  if (metadata.responseMode === "chat") return false;

  return typeof metadata.spokenText === "string" && !!metadata.spokenText.trim();
}

function getLatestAvatarExchange(
  session: TutorChatSession | null,
  sending: boolean
) {
  const messages = session?.messages ?? [];
  const latestUserIndex = messages.findLastIndex(
    (message) => message.senderType === "user" && message.content.trim()
  );

  if (latestUserIndex < 0) {
    return { aiMessage: null, userMessage: null };
  }

  const userMessage = messages[latestUserIndex];
  const aiMessage =
    messages
      .slice(latestUserIndex + 1)
      .find((message) => message.senderType === "ai") ?? null;

  if (!sending && !isAvatarAiMessage(aiMessage)) {
    return { aiMessage: null, userMessage: null };
  }

  return { aiMessage, userMessage };
}

function LatestAvatarExchange({
  aiMessage,
  answerVisible,
  sending,
  userMessage,
}: {
  aiMessage: TutorMessage | null;
  answerVisible: boolean;
  sending: boolean;
  userMessage: TutorMessage | null;
}) {
  if (!userMessage) return null;

  const aiContent = getAvatarSpokenText(aiMessage);

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-10 flex w-[min(26rem,calc(100%-2rem))] flex-col items-end gap-3">
      <div className="pointer-events-auto max-w-[88%]">
        <div className="max-h-[22vh] overflow-y-auto rounded-2xl bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-lg">
          <p className="whitespace-pre-wrap break-words">{userMessage.content}</p>
        </div>
      </div>

      {(aiContent || sending) && (
        <div className="pointer-events-auto w-full">
          <div className="max-h-[34vh] overflow-y-auto rounded-2xl border bg-card/95 px-4 py-3 text-sm leading-relaxed text-card-foreground shadow-lg backdrop-blur-md">
            {!answerVisible || sending ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {sending
                  ? "Tutor AI sedang menjawab..."
                  : "Tutor AI sedang menyiapkan suara..."}
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words">{aiContent}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getLatestSpeakableAvatarMessage(session: TutorChatSession | null) {
  const latestAiMessage = getLatestAiMessage(session);
  if (!isAvatarAiMessage(latestAiMessage)) return null;

  return latestAiMessage;
}

function getAvatarSpokenText(message: TutorMessage | null | undefined) {
  if (!message) return "";
  if (!message.ragSources || typeof message.ragSources !== "object") {
    return message.content.trim();
  }

  const spokenText = (message.ragSources as { spokenText?: unknown }).spokenText;
  return typeof spokenText === "string" && spokenText.trim()
    ? spokenText.trim()
    : message.content.trim();
}

function getLatestAiAvatarExpression(session: TutorChatSession | null): AvatarExpression {
  const latestAiMessage = getLatestAiMessage(session);
  if (!isAvatarAiMessage(latestAiMessage)) return "neutral";

  const ragSources = latestAiMessage?.ragSources;
  if (!ragSources || typeof ragSources !== "object") return "neutral";

  const avatarExpression = (ragSources as { avatarExpression?: unknown }).avatarExpression;
  if (avatarExpression === "happy" || avatarExpression === "concerned") {
    return avatarExpression;
  }

  return "neutral";
}

async function getTtsErrorMessage(response: Response) {
  const fallback = `TTS gagal (${response.status} ${response.statusText})`;
  const body = await response.text().catch(() => "");
  if (!body) return fallback;

  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    if (typeof parsed.error === "string") {
      return `${fallback}: ${parsed.error}`;
    }

    if (Array.isArray(parsed.error)) {
      return `${fallback}: ${parsed.error
        .map((issue) =>
          typeof issue === "object" && issue && "message" in issue
            ? String(issue.message)
            : "Payload tidak valid"
        )
        .join(", ")}`;
    }
  } catch {
    return `${fallback}: ${body.slice(0, 180)}`;
  }

  return fallback;
}

export function TutorAvatarPanel(props: TutorAvatarPanelProps) {
  const [avatarReady, setAvatarReady] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarAnswerVisible, setAvatarAnswerVisible] = useState(!props.sending);
  const [avatarPreparingSpeech, setAvatarPreparingSpeech] = useState(false);
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const animationMode: AvatarAnimationMode = avatarSpeaking
    ? "talking"
    : props.sending || avatarPreparingSpeech
      ? "thinking"
      : "idle";
  const expression = getAvatarExpression(props, animationMode);
  const speechMessage = getLatestSpeakableAvatarMessage(props.activeSession);
  const speechMessageId = speechMessage?.id ?? null;
  const speechText = getAvatarSpokenText(speechMessage);
  const latestExchange = getLatestAvatarExchange(
    props.activeSession,
    props.sending
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wasSendingRef = useRef(props.sending);
  const speechBaselineMessageIdRef = useRef(props.sending ? speechMessageId : null);
  const handleAvatarReady = useCallback((ready: boolean) => {
    setAvatarReady(ready);
    setAvatarLoadFailed(!ready);
  }, []);
  const startAvatarSpeech = useCallback(() => {
    setAvatarAnswerVisible(true);
    setAvatarPreparingSpeech(false);
    setAvatarSpeaking(true);
  }, []);

  const getAvatarAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (audioContextRef.current) return audioContextRef.current;

    const AudioContextConstructor =
      window.AudioContext ?? (window as BrowserAudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    audioContextRef.current = new AudioContextConstructor();
    return audioContextRef.current;
  }, []);

  const clearAvatarAudio = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (speechUtteranceRef.current) {
        speechUtteranceRef.current.onend = null;
        speechUtteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
      speechUtteranceRef.current = null;
    }

    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      try {
        audioSourceRef.current.stop();
      } catch {
        // Source may already be stopped.
      }
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.onpause = null;
      audioRef.current.onplay = null;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const stopAvatarSpeech = useCallback(() => {
    clearAvatarAudio();
    setAvatarPreparingSpeech(false);
    setAvatarSpeaking(false);
  }, [clearAvatarAudio]);

  const unlockAvatarAudio = useCallback(() => {
    const audioContext = getAvatarAudioContext();
    if (audioContext?.state === "suspended") {
      void audioContext.resume().catch(() => {});
    }
  }, [getAvatarAudioContext]);

  const playWithHtmlAudio = useCallback(
    async (audioBlob: Blob) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audioUrlRef.current = audioUrl;
      audioRef.current = audio;
      audio.onplay = startAvatarSpeech;
      audio.onended = stopAvatarSpeech;
      audio.onerror = stopAvatarSpeech;
      audio.onpause = () => {
        if (audio.ended) return;
        setAvatarSpeaking(false);
      };

      await audio.play();
    },
    [startAvatarSpeech, stopAvatarSpeech]
  );

  const playWithWebAudio = useCallback(
    async (audioBlob: Blob) => {
      const audioContext = getAvatarAudioContext();
      if (!audioContext) {
        await playWithHtmlAudio(audioBlob);
        return;
      }

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = stopAvatarSpeech;
      audioSourceRef.current = source;

      startAvatarSpeech();
      source.start(0);
    },
    [getAvatarAudioContext, playWithHtmlAudio, startAvatarSpeech, stopAvatarSpeech]
  );

  const playWithBrowserSpeech = useCallback(
    (text: string) => {
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        !("SpeechSynthesisUtterance" in window)
      ) {
        throw new Error("Browser speech synthesis tidak tersedia.");
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.96;
      utterance.pitch = 1.02;
      utterance.onstart = startAvatarSpeech;
      utterance.onend = stopAvatarSpeech;
      utterance.onerror = stopAvatarSpeech;
      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [startAvatarSpeech, stopAvatarSpeech]
  );

  useEffect(() => {
    if (props.sending) {
      setAvatarAnswerVisible(false);
    } else if (props.loadingSession) {
      setAvatarAnswerVisible(true);
    }
  }, [props.loadingSession, props.sending]);

  useEffect(() => {
    document.addEventListener("pointerdown", unlockAvatarAudio, { passive: true });
    document.addEventListener("keydown", unlockAvatarAudio);

    return () => {
      document.removeEventListener("pointerdown", unlockAvatarAudio);
      document.removeEventListener("keydown", unlockAvatarAudio);
    };
  }, [unlockAvatarAudio]);

  useEffect(() => {
    if (props.sending) {
      if (!wasSendingRef.current) {
        speechBaselineMessageIdRef.current = speechMessageId;
      }
      wasSendingRef.current = true;
      return;
    }

    if (!wasSendingRef.current) return;

    wasSendingRef.current = false;
    const baselineMessageId = speechBaselineMessageIdRef.current;
    speechBaselineMessageIdRef.current = null;

    if (
      props.loadingSession ||
      !speechMessageId ||
      !speechText ||
      speechMessageId === baselineMessageId
    ) {
      return;
    }

    const controller = new AbortController();
    setAvatarPreparingSpeech(true);
    clearAvatarAudio();

    async function playAvatarSpeech() {
      try {
        const response = await fetch(`/api/courses/${props.courseId}/tutor/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: speechText }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorMessage = await getTtsErrorMessage(response);
          console.warn("[avatar-tts] ElevenLabs gagal, memakai browser TTS.", errorMessage);
          playWithBrowserSpeech(speechText);
          return;
        }

        const audioBlob = await response.blob();
        if (controller.signal.aborted) return;

        if (audioBlob.size === 0) {
          throw new Error("Audio avatar kosong");
        }

        await playWithWebAudio(audioBlob);
      } catch (error) {
        console.warn("[avatar-tts] Audio avatar gagal diputar.", error);
        if (!controller.signal.aborted) {
          try {
            playWithBrowserSpeech(speechText);
          } catch {
            setAvatarAnswerVisible(true);
            stopAvatarSpeech();
          }
        }
      }
    }

    void playAvatarSpeech();

    return () => {
      controller.abort();
      setAvatarPreparingSpeech(false);
    };
  }, [
    clearAvatarAudio,
    playWithBrowserSpeech,
    playWithWebAudio,
    props.courseId,
    props.loadingSession,
    props.sending,
    speechMessageId,
    speechText,
    stopAvatarSpeech,
  ]);

  useEffect(() => clearAvatarAudio, [clearAvatarAudio]);

  return (
    <div
      className="relative flex-1 overflow-hidden bg-background"
      aria-label="Avatar Tutor AI"
    >
      <Canvas
        className="absolute inset-0"
        camera={{ fov: 40, position: [0, 1, 5.3] }}
        dpr={[1, 1.75]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
      >
        <AvatarStage
          animationMode={animationMode}
          customization={props.customization}
          expression={expression}
          onReady={handleAvatarReady}
          speaking={avatarSpeaking}
        />
      </Canvas>
      {!avatarReady && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
            {!avatarLoadFailed && <Loader2 className="size-4 animate-spin" />}
            {avatarLoadFailed ? "Avatar gagal dimuat" : "Memuat avatar"}
          </div>
        </div>
      )}
      <LatestAvatarExchange
        aiMessage={latestExchange.aiMessage}
        answerVisible={avatarAnswerVisible}
        sending={props.sending}
        userMessage={latestExchange.userMessage}
      />
    </div>
  );
}

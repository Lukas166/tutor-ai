"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  AnimationMixer,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
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

import type { TutorChatSession } from "./tutor-chat-types";

const AVATAR_ASSET_VERSION = "20260525-1";

function avatarAssetPath(path: string) {
  return `${path}?v=${AVATAR_ASSET_VERSION}`;
}

const AVATAR_MODEL_PATH = avatarAssetPath("/modelavatar/ModelMuslim.glb");
const BODY_TEXTURE_PATH = avatarAssetPath("/modelavatar/BodyTexture.png");
const FOOT_TEXTURE_PATH = avatarAssetPath("/modelavatar/FootTexture.png");
const HEADBAND_TEXTURE_PATH = avatarAssetPath("/modelavatar/HeadbandTexture.png");
const HIJAB_TEXTURE_PATH = avatarAssetPath("/modelavatar/HijabTexture.png");
const NORMAL_FACE_TEXTURE_PATH = avatarAssetPath("/modelavatar/NormalFaceExpressionTexture.png");
const TALK_FACE_TEXTURE_PATH = avatarAssetPath("/modelavatar/TalkFaceExpressionTexture.png");
const HAPPY_FACE_TEXTURE_PATH = avatarAssetPath("/modelavatar/HappyFaceExpressionTexture.png");
const SAD_FACE_TEXTURE_PATH = avatarAssetPath("/modelavatar/SadFaceExpressionTexture.png");
const AVATAR_MODEL_SCALE = 0.5;
const AVATAR_MODEL_POSITION: [number, number, number] = [0, 0.68, 0];

type AvatarExpression = "neutral" | "speaking" | "happy" | "concerned";
type BrowserAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

type TutorAvatarPanelProps = {
  activeSession: TutorChatSession | null;
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
  if (mesh === "cylinder.004" || material === "material.007") return materials.foot;
  if (
    mesh === "sphere.001" ||
    mesh === "sphere.002" ||
    material === "material" ||
    material === "material.005"
  ) {
    return materials.headband;
  }
  if (material === "material.006" || material === "material.010") return materials.face;
  if (
    mesh === "cylinder.003" ||
    material === "material.008" ||
    material === "material.003"
  ) {
    return materials.body;
  }
  if (material === "material.002") return materials.skin;

  return materials.skin;
}

function getFaceTexture(textures: LoadedAvatarAssets["faceTextures"], expression: AvatarExpression) {
  return textures[expression];
}

function AvatarModel({
  expression,
  onReady,
  speaking,
}: {
  expression: AvatarExpression;
  onReady: (ready: boolean) => void;
  speaking: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const animationMixerRef = useRef<AnimationMixer | null>(null);
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
      loadTexture(textureLoader, FOOT_TEXTURE_PATH),
      loadTexture(textureLoader, HEADBAND_TEXTURE_PATH),
      loadTexture(textureLoader, HIJAB_TEXTURE_PATH),
      loadTexture(textureLoader, NORMAL_FACE_TEXTURE_PATH),
      loadTexture(textureLoader, TALK_FACE_TEXTURE_PATH),
      loadTexture(textureLoader, HAPPY_FACE_TEXTURE_PATH),
      loadTexture(textureLoader, SAD_FACE_TEXTURE_PATH),
    ])
      .then(([
        gltf,
        bodyTexture,
        footTexture,
        headbandTexture,
        hijabTexture,
        normalFaceTexture,
        talkFaceTexture,
        happyFaceTexture,
        sadFaceTexture,
      ]) => {
        if (cancelled) return;

        const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

        [
          bodyTexture,
          footTexture,
          headbandTexture,
          hijabTexture,
          normalFaceTexture,
          talkFaceTexture,
          happyFaceTexture,
          sadFaceTexture,
        ].forEach((texture) => prepareColorTexture(texture, maxAnisotropy));

        setAssets({
          animations: gltf.animations,
          scene: gltf.scene,
          bodyTexture,
          faceTextures: {
            neutral: normalFaceTexture,
            speaking: talkFaceTexture,
            happy: happyFaceTexture,
            concerned: sadFaceTexture,
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
    faceMaterialRef.current = materials?.face ?? null;
  }, [materials]);

  useEffect(() => {
    if (!assets || assets.animations.length === 0) {
      animationMixerRef.current = null;
      return;
    }

    const mixer = new AnimationMixer(assets.scene);
    const action = mixer.clipAction(assets.animations[0]);
    action.reset().play();
    animationMixerRef.current = mixer;

    return () => {
      action.stop();
      mixer.stopAllAction();
      animationMixerRef.current = null;
    };
  }, [assets]);

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
  expression,
  onReady,
  speaking,
}: {
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
        <AvatarModel expression={expression} onReady={onReady} speaking={speaking} />
      </group>
    </>
  );
}

function getAvatarExpression({
  activeSession,
  loadingSession,
  recording,
  transcribing,
}: TutorAvatarPanelProps): AvatarExpression {
  if (recording) return "happy";
  if (transcribing || loadingSession) return "concerned";

  return getLatestAiAvatarExpression(activeSession);
}

function getLatestAiMessage(session: TutorChatSession | null) {
  return session?.messages
    .slice()
    .reverse()
    .find((message) => message.senderType === "ai" && message.content.trim());
}

function getLatestSpeakableAvatarAnswer(session: TutorChatSession | null) {
  const latestAiMessage = getLatestAiMessage(session);
  if (!latestAiMessage?.ragSources) return "";

  return latestAiMessage.content.trim();
}

function getLatestAiAvatarExpression(session: TutorChatSession | null): AvatarExpression {
  const ragSources = getLatestAiMessage(session)?.ragSources;
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
  const expression = getAvatarExpression(props);
  const [avatarReady, setAvatarReady] = useState(false);
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [spokenSubtitle, setSpokenSubtitle] = useState("");
  const speechText = getLatestSpeakableAvatarAnswer(props.activeSession);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenTextRef = useRef(speechText);
  const handleAvatarReady = useCallback((ready: boolean) => {
    setAvatarReady(ready);
  }, []);
  const waitingForSpeech = props.sending && !avatarSpeaking;

  const startAvatarSpeech = useCallback((text: string) => {
    setSpokenSubtitle(text);
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
    setAvatarSpeaking(false);
    setSpokenSubtitle("");
  }, [clearAvatarAudio]);

  const unlockAvatarAudio = useCallback(() => {
    const audioContext = getAvatarAudioContext();
    if (audioContext?.state === "suspended") {
      void audioContext.resume().catch(() => {});
    }
  }, [getAvatarAudioContext]);

  const playWithHtmlAudio = useCallback(
    async (audioBlob: Blob, text: string) => {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audioUrlRef.current = audioUrl;
      audioRef.current = audio;
      audio.onplay = () => startAvatarSpeech(text);
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
    async (audioBlob: Blob, text: string) => {
      const audioContext = getAvatarAudioContext();
      if (!audioContext) {
        await playWithHtmlAudio(audioBlob, text);
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

      startAvatarSpeech(text);
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
      utterance.onstart = () => startAvatarSpeech(text);
      utterance.onend = stopAvatarSpeech;
      utterance.onerror = stopAvatarSpeech;
      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [startAvatarSpeech, stopAvatarSpeech]
  );

  useEffect(() => {
    document.addEventListener("pointerdown", unlockAvatarAudio, { passive: true });
    document.addEventListener("keydown", unlockAvatarAudio);

    return () => {
      document.removeEventListener("pointerdown", unlockAvatarAudio);
      document.removeEventListener("keydown", unlockAvatarAudio);
    };
  }, [unlockAvatarAudio]);

  useEffect(() => {
    if (!speechText || speechText === lastSpokenTextRef.current) return;

    lastSpokenTextRef.current = speechText;
    const controller = new AbortController();
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

        await playWithWebAudio(audioBlob, speechText);
      } catch (error) {
        console.warn("[avatar-tts] Audio avatar gagal diputar.", error);
        if (!controller.signal.aborted) {
          try {
            playWithBrowserSpeech(speechText);
          } catch {
            stopAvatarSpeech();
          }
        }
      }
    }

    void playAvatarSpeech();

    return () => {
      controller.abort();
    };
  }, [
    clearAvatarAudio,
    playWithBrowserSpeech,
    playWithWebAudio,
    props.courseId,
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
          expression={expression}
          onReady={handleAvatarReady}
          speaking={avatarSpeaking}
        />
      </Canvas>
      {!avatarReady && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Loader2 className="size-4 animate-spin" />
            Memuat avatar
          </div>
        </div>
      )}
      {waitingForSpeech && (
        <div className="pointer-events-none absolute inset-x-4 bottom-48 z-10 flex justify-center sm:bottom-52">
          <div className="max-w-[min(680px,calc(100vw-2rem))] rounded-md bg-zinc-700/78 px-4 py-3 text-center text-sm font-medium leading-relaxed text-zinc-200 shadow-xl backdrop-blur sm:text-base">
            Tutor AI sedang berpikir...
          </div>
        </div>
      )}
      {avatarSpeaking && spokenSubtitle && (
        <div className="pointer-events-none absolute inset-x-4 bottom-48 z-10 flex justify-center sm:bottom-52">
          <div className="max-w-[min(680px,calc(100vw-2rem))] rounded-md bg-black/88 px-4 py-3 text-center text-sm font-medium leading-relaxed text-white shadow-xl backdrop-blur sm:text-base">
            {spokenSubtitle}
          </div>
        </div>
      )}
    </div>
  );
}

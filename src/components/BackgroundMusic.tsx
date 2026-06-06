/* eslint-disable react-hooks/immutability --
 * expo-audio's useAudioPlayer returns a mutable AudioPlayer handle; setting
 * `.loop` / `.muted` / `.volume` is its documented, intended API. */
import { useEffect } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Background music. Plays a bundled MP3 on loop via `expo-audio` — real
 * autoplay, no WebView, no network. Renders nothing; only sound comes out.
 *
 * To change the track, replace `assets/audio/theme.mp3` (or repoint the require
 * below). Default is *unmuted* (music on); `muted` silences without stopping.
 *
 * `setAudioModeAsync({ playsInSilentMode: true })` lets it play even when the
 * iPhone ring/silent switch is on — the right behavior for an opt-in soundtrack.
 */
const THEME = require('../../assets/audio/theme.mp3');

type Props = {
  /** When true, audio is silenced (the loop keeps running underneath). */
  muted: boolean;
};

export function BackgroundMusic({ muted }: Props): null {
  const player = useAudioPlayer(THEME);

  // Configure the shared audio session once so sound isn't killed by the
  // hardware silent switch, and don't hijack background audio.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {
      // Non-fatal: worst case audio is silenced by the ring switch.
    });
  }, []);

  // Start looping playback once the player exists.
  useEffect(() => {
    player.loop = true;
    player.volume = 1;
    player.play();
  }, [player]);

  // Follow the mute toggle live.
  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  return null;
}

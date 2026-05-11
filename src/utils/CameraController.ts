// Lightweight singleton to decouple TokenLayer from GameScreen camera.
// TokenLayer calls CameraController.panTo(position) at each animation step.
// GameScreen registers the actual centerOnPosition function.

type PanCallback = (position: number) => void;

let _callback: PanCallback | null = null;

export const CameraController = {
  register(cb: PanCallback) {
    _callback = cb;
  },
  unregister() {
    _callback = null;
  },
  panTo(position: number) {
    if (_callback) _callback(position);
  },
};

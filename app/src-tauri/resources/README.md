# Standalone Virtual Camera Driver Directory

This directory contains the `softcam.dll` DirectShow filter, which serves as the standalone virtual camera device for Windows.

### Attribution
The virtual camera driver used in this project is based on the open-source **softcam** project:
[https://github.com/tshino/softcam](https://github.com/tshino/softcam)

### How it works:
1. When the app starts, the Tauri Rust backend reads the `softcam.dll` from this resources directory.
2. The app uses an elevated PowerShell process to register the DirectShow filter with Windows via `regsvr32`.
3. Once registered, the virtual camera device will appear in applications like OBS, Zoom, and Google Meet.
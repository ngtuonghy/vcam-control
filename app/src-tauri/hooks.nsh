!macro NSIS_HOOK_PREINSTALL
  ; Clean up the previous .old file if it exists and is no longer locked
  IfFileExists "$INSTDIR\resources\softcam.dll.old" 0 +2
    Delete "$INSTDIR\resources\softcam.dll.old"

  ; Rename the currently locked softcam.dll to softcam.dll.old
  IfFileExists "$INSTDIR\resources\softcam.dll" 0 +2
    Rename "$INSTDIR\resources\softcam.dll" "$INSTDIR\resources\softcam.dll.old"
!macroend

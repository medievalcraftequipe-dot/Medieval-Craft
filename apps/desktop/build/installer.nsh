!include LogicLib.nsh

!macro customInit
  ${If} ${Silent}
    DetailPrint "Closing running Tempest Light before silent update."
    nsExec::ExecToStack 'taskkill /IM "Tempest Light.exe" /T /F'
    Pop $0
    Pop $1
    Sleep 2000
  ${EndIf}
!macroend

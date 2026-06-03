Pod::Spec.new do |s|
  s.name           = 'TamagamiNearby'
  s.version        = '1.0.0'
  s.summary        = 'BLE nearby-pet discovery for TAMAGAMI'
  s.description    = 'CoreBluetooth advertise + scan so two TAMAGAMI pets can meet when physically near each other.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

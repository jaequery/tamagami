import ExpoModulesCore
import CoreBluetooth

// BLE nearby-pet discovery.
//
// Each device plays BOTH roles at once:
//   • Peripheral — advertises the TAMAGAMI service UUID with the local pet's
//     payload packed into the advertisement's local-name field.
//   • Central    — scans for that same service UUID and reads the peer's
//     local-name straight out of the advertisement packet.
//
// Packing the payload into the local name avoids a GATT connect/read round-trip:
// discovery is a single passive scan callback. iOS only surfaces the full local
// name + service UUID list while the advertiser is FOREGROUNDED, which matches
// the product design (pets meet while both apps are open).
public class TamagamiNearbyModule: Module {
  // Must stay byte-for-byte identical to SERVICE_UUID in src/game/nearby.ts.
  private static let serviceUUID = CBUUID(string: "F00DBEEF-0000-1000-8000-00805F9B34FB")

  // Re-emit the same peer at most once per this interval. allowDuplicates scans
  // fire continuously; without this the JS bridge would be flooded.
  private static let reemitInterval: TimeInterval = 5.0

  private var peripheralManager: CBPeripheralManager?
  private var centralManager: CBCentralManager?

  private var payload: String = ""
  private var wantsRunning = false
  private var lastSeen: [String: TimeInterval] = [:]

  public func definition() -> ModuleDefinition {
    Name("TamagamiNearby")

    Events("onPeerFound", "onStateChange")

    Function("isSupported") { () -> Bool in
      true
    }

    AsyncFunction("start") { (payload: String) in
      self.payload = payload
      self.wantsRunning = true

      if self.peripheralManager == nil {
        self.peripheralManager = CBPeripheralManager(delegate: self.peripheralDelegate, queue: .main)
      } else {
        self.startAdvertisingIfReady()
      }

      if self.centralManager == nil {
        self.centralManager = CBCentralManager(delegate: self.centralDelegate, queue: .main)
      } else {
        self.startScanningIfReady()
      }
    }.runOnQueue(.main)

    AsyncFunction("stop") { () in
      self.wantsRunning = false
      if self.peripheralManager?.isAdvertising == true {
        self.peripheralManager?.stopAdvertising()
      }
      if self.centralManager?.isScanning == true {
        self.centralManager?.stopScan()
      }
      self.lastSeen.removeAll()
    }.runOnQueue(.main)

    OnDestroy {
      self.peripheralManager?.stopAdvertising()
      if self.centralManager?.isScanning == true {
        self.centralManager?.stopScan()
      }
    }
  }

  // CoreBluetooth requires NSObject delegates; Module isn't one, so we route
  // callbacks through dedicated NSObject shims that forward to this module.
  private lazy var peripheralDelegate = PeripheralDelegate(module: self)
  private lazy var centralDelegate = CentralDelegate(module: self)

  // MARK: - Start helpers

  fileprivate func startAdvertisingIfReady() {
    guard wantsRunning,
          let manager = peripheralManager,
          manager.state == .poweredOn else { return }

    if manager.isAdvertising { manager.stopAdvertising() }
    manager.startAdvertising([
      CBAdvertisementDataServiceUUIDsKey: [Self.serviceUUID],
      CBAdvertisementDataLocalNameKey: payload,
    ])
  }

  fileprivate func startScanningIfReady() {
    guard wantsRunning,
          let manager = centralManager,
          manager.state == .poweredOn else { return }

    manager.scanForPeripherals(
      withServices: [Self.serviceUUID],
      options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
    )
  }

  // MARK: - Delegate forwards

  fileprivate func handleCentralStateUpdate(_ state: CBManagerState) {
    sendEvent("onStateChange", ["role": "central", "state": Self.stateString(state)])
    if state == .poweredOn { startScanningIfReady() }
  }

  fileprivate func handlePeripheralStateUpdate(_ state: CBManagerState) {
    sendEvent("onStateChange", ["role": "peripheral", "state": Self.stateString(state)])
    if state == .poweredOn { startAdvertisingIfReady() }
  }

  fileprivate func handleDiscovery(advertisementData: [String: Any], rssi: NSNumber) {
    guard let name = advertisementData[CBAdvertisementDataLocalNameKey] as? String,
          !name.isEmpty else { return }

    let now = Date().timeIntervalSince1970
    if let last = lastSeen[name], now - last < Self.reemitInterval { return }
    lastSeen[name] = now

    sendEvent("onPeerFound", ["payload": name, "rssi": rssi.intValue])
  }

  private static func stateString(_ state: CBManagerState) -> String {
    switch state {
    case .poweredOn:    return "poweredOn"
    case .poweredOff:   return "poweredOff"
    case .unauthorized: return "unauthorized"
    case .unsupported:  return "unsupported"
    case .resetting:    return "resetting"
    case .unknown:      return "unknown"
    @unknown default:   return "unknown"
    }
  }
}

// MARK: - NSObject delegate shims

private final class CentralDelegate: NSObject, CBCentralManagerDelegate {
  weak var module: TamagamiNearbyModule?

  init(module: TamagamiNearbyModule) {
    self.module = module
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    module?.handleCentralStateUpdate(central.state)
  }

  func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    module?.handleDiscovery(advertisementData: advertisementData, rssi: RSSI)
  }
}

private final class PeripheralDelegate: NSObject, CBPeripheralManagerDelegate {
  weak var module: TamagamiNearbyModule?

  init(module: TamagamiNearbyModule) {
    self.module = module
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    module?.handlePeripheralStateUpdate(peripheral.state)
  }
}

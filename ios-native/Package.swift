// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Sycord",
    platforms: [.iOS(.v16)],
    products: [.library(name: "Sycord", targets: ["Sycord"])],
    targets: [.target(name: "Sycord", path: "Sources/Sycord")],
    swiftLanguageModes: [.v5]
)

#!/usr/bin/env swift

import Cocoa

// Swift utility to trigger hardware haptic feedback on MacBook trackpad
// Usage: ./haptic <intensity>
// intensity: light, medium, heavy

@available(macOS 10.11, *)
func triggerHaptic(intensity: String) {
    let performer = NSHapticFeedbackManager.defaultPerformer
    
    // Map intensity to haptic patterns
    let pattern: NSHapticFeedbackManager.FeedbackPattern
    
    switch intensity.lowercased() {
    case "light":
        pattern = .generic
    case "medium":
        pattern = .alignment
    case "heavy":
        pattern = .levelChange
    default:
        pattern = .generic
    }
    
    // Perform the haptic feedback
    performer.perform(pattern, performanceTime: .now)
}

// Main execution
let arguments = CommandLine.arguments

if arguments.count < 2 {
    print("Usage: haptic <intensity>")
    print("intensity: light, medium, heavy")
    exit(1)
}

let intensity = arguments[1]

if #available(macOS 10.11, *) {
    triggerHaptic(intensity: intensity)
} else {
    print("Error: Haptic feedback requires macOS 10.11 or later")
    exit(1)
}

// Keep the program alive briefly to ensure haptic completes
usleep(50000) // 50ms

exit(0)

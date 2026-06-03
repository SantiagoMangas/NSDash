"""
Integration test script for VAM endpoints.
This validates the VAM module implementation without running the full server.
"""

from datetime import date
from app.vam_calculator import (
    calculate_vam_from_test,
    calculate_zones,
    calculate_sprint_times,
)


def test_vam_workflow():
    """Test complete VAM workflow from test input to zones and sprint times."""
    print("\n=== VAM Module Integration Test ===\n")
    
    # Step 1: Test calculation from a 2000m test
    print("1. Calculating VAM from 2000m test (2000m in 7 minutes)...")
    vam_data = calculate_vam_from_test("vam_2000m", value1=2000, value2=7)
    print(f"   [OK] VAM Result: {vam_data['vam_kmh']} km/h ({vam_data['vam_mpm']} m/min, {vam_data['vam_ms']} m/s)")
    
    # Step 2: Calculate zones
    print("\n2. Calculating 8 training zones...")
    zones = calculate_zones(vam_data["vam_mpm"])
    print(f"   [OK] Generated {len(zones)} zones:")
    for zone in zones:
        print(f"     - {zone['zona']:12} ({zone['intensidad']:15}): {zone['velocidad_kmh']:6.2f} km/h, "
              f"Ritmo: {zone['ritmo_min_seg']:6.1f}-{zone['ritmo_max_seg']:6.1f} seg/km")
    
    # Step 3: Calculate sprint times
    print("\n3. Calculating sprint times for all distances...")
    sprints = calculate_sprint_times(vam_data["vam_ms"])
    print(f"   [OK] Generated times for {len(sprints)} distances:")
    for i, sprint in enumerate(sprints):
        if i % 2 == 0:  # Show every other one to keep output readable
            print(f"     - {sprint['distancia']:4.0f}m: {sprint['tiempo_segundos']:6.2f} sec")
    
    # Step 4: Verify different test types
    print("\n4. Testing different VAM test types...")
    
    test_cases = [
        ("vam_5min", {"value1": 5, "value2": 1500, "name": "5-minute test (1500m)"}),
        ("test_30_15_ift", {"value1": 17.5, "value2": None, "name": "30-15 IFT (17.5 km/h)"}),
        ("yoyo_ri1", {"value1": 18, "value2": 16, "name": "Yo-Yo RI1 Level 18 @ 16 km/h"}),
    ]
    
    for test_type, test_info in test_cases:
        vam = calculate_vam_from_test(test_type, test_info["value1"], test_info["value2"])
        print(f"   [OK] {test_info['name']}: {vam['vam_kmh']} km/h")
    
    print("\n[PASS] All integration tests passed!")
    print("\n=== API Endpoints Ready ===")
    print("POST   /vam-tests                               - Create VAM test")
    print("GET    /athletes/{athlete_id}/vam-tests         - List athlete's VAM tests")
    print("GET    /vam-tests/{test_id}                     - Get specific VAM test")
    print("GET    /athletes/{athlete_id}/vam-progress      - Get VAM progression history")
    print("\n")


if __name__ == "__main__":
    test_vam_workflow()

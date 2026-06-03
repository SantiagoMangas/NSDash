"""
Unit tests for vam_calculator.py
Run with: pytest test_vam_calculator.py -v
"""

import pytest
from app.vam_calculator import (
    calculate_vam_from_test,
    calculate_zones,
    calculate_sprint_times,
)


class TestCalculateVamFromTest:
    """Test VAM calculation from different test types."""
    
    def test_vam_2000m(self):
        """Test VAM from 2000m test: 2000m in 7 minutes."""
        result = calculate_vam_from_test("vam_2000m", value1=2000, value2=7)
        
        # Ritmo promedio = (7 * 60) / 2000 = 0.21 seg/m
        # VAM = 60 / 0.21 = 285.71 m/min
        # VAM km/h = (285.71 * 60) / 1000 = 17.14 km/h
        # VAM m/s = 285.71 / 60 = 4.76 m/s
        
        assert result["vam_mpm"] == pytest.approx(285.71, rel=0.01)
        assert result["vam_kmh"] == pytest.approx(17.14, rel=0.01)
        assert result["vam_ms"] == pytest.approx(4.76, rel=0.01)
    
    def test_vam_5min(self):
        """Test VAM from 5-minute test: 1500m in 5 minutes."""
        result = calculate_vam_from_test("vam_5min", value1=5, value2=1500)
        
        # Ritmo promedio = (5 * 60) / 1500 = 0.2 seg/m
        # VAM = 60 / 0.2 = 300 m/min = 18 km/h
        
        assert result["vam_mpm"] == pytest.approx(300, rel=0.01)
        assert result["vam_kmh"] == pytest.approx(18, rel=0.01)
        assert result["vam_ms"] == pytest.approx(5, rel=0.01)
    
    def test_test_30_15_ift(self):
        """Test 30-15 IFT test: reached 17.5 km/h."""
        result = calculate_vam_from_test("test_30_15_ift", value1=17.5)
        
        # VIFT is the VAM directly
        assert result["vam_kmh"] == pytest.approx(17.5, rel=0.01)
        assert result["vam_mpm"] == pytest.approx(291.67, rel=0.01)
        assert result["vam_ms"] == pytest.approx(4.86, rel=0.01)
    
    def test_yoyo_ri1(self):
        """Test Yo-Yo Intermittent Recovery test: level 18 at 16 km/h."""
        result = calculate_vam_from_test("yoyo_ri1", value1=18, value2=16)
        
        # Use velocity from test
        assert result["vam_kmh"] == pytest.approx(16, rel=0.01)
        assert result["vam_mpm"] == pytest.approx(266.67, rel=0.01)
        assert result["vam_ms"] == pytest.approx(4.44, rel=0.01)
    
    def test_invalid_test_type(self):
        """Test raises error for unknown test_type."""
        with pytest.raises(ValueError, match="Unknown test_type"):
            calculate_vam_from_test("invalid_test", value1=100)
    
    def test_missing_required_value(self):
        """Test raises error when required value2 is missing."""
        with pytest.raises(ValueError, match="requires value2"):
            calculate_vam_from_test("vam_2000m", value1=2000, value2=None)


class TestCalculateZones:
    """Test zone calculation from VAM."""
    
    def test_calculate_zones_basic(self):
        """Test zone calculation with 300 m/min VAM."""
        zones = calculate_zones(300)
        
        # Should have 8 zones
        assert len(zones) == 8
        
        # Check first zone (Recuperación: 55-65% of 300)
        z1 = zones[0]
        assert z1["zona"] == "Zona 1"
        assert z1["intensidad"] == "Recuperación"
        assert z1["pct_min"] == 0.55
        assert z1["pct_max"] == 0.65
        # Max velocity = 300 * 0.65 = 195 m/min = 3.25 m/s = 11.7 km/h
        assert z1["velocidad_ms"] == pytest.approx(3.25, rel=0.01)
        assert z1["velocidad_kmh"] == pytest.approx(11.7, rel=0.01)
        
        # Check last zone (Glucolítico II: 110-120% of 300)
        z8 = zones[7]
        assert z8["zona"] == "Zona 8"
        assert z8["intensidad"] == "Glucolítico II"
        # Max velocity = 300 * 1.20 = 360 m/min = 6 m/s = 21.6 km/h
        assert z8["velocidad_ms"] == pytest.approx(6.0, rel=0.01)
        assert z8["velocidad_kmh"] == pytest.approx(21.6, rel=0.01)
    
    def test_zone_paces(self):
        """Test that pace calculations are in reasonable range."""
        zones = calculate_zones(300)
        
        # Paces should be in seconds per km
        # For 300 m/min (5 m/s = 18 km/h):
        # Fastest zone (Zona 8 at 100%): 360 m/min = 6 m/s = 21.6 km/h = 166.7 sec/km = ~2:46/km
        # Slowest zone (Zona 1 at 55%): 165 m/min = 2.75 m/s = 9.9 km/h = 606.1 sec/km = ~10:06/km
        
        z1_pace = zones[0]["ritmo_max_seg"]  # slowest
        z8_pace = zones[7]["ritmo_min_seg"]  # fastest
        
        # Slowest should be > fastest
        assert z1_pace > z8_pace
        # Both should be reasonable (between 2:00 and 12:00 per km)
        assert 120 < z1_pace < 720
        assert 120 < z8_pace < 720


class TestCalculateSprintTimes:
    """Test sprint time calculation."""
    
    def test_calculate_sprint_times(self):
        """Test sprint times for 5 m/s VAM."""
        times = calculate_sprint_times(5.0)
        
        # Should have 11 distances
        assert len(times) == 11
        
        # Check first distance: 10m at 5m/s = 2 seconds
        assert times[0]["distancia"] == 10
        assert times[0]["tiempo_segundos"] == pytest.approx(2.0, rel=0.01)
        
        # Check 100m: 100m at 5m/s = 20 seconds
        idx_100 = next(i for i, t in enumerate(times) if t["distancia"] == 100)
        assert times[idx_100]["tiempo_segundos"] == pytest.approx(20.0, rel=0.01)
        
        # Check 1000m: 1000m at 5m/s = 200 seconds
        idx_1000 = next(i for i, t in enumerate(times) if t["distancia"] == 1000)
        assert times[idx_1000]["tiempo_segundos"] == pytest.approx(200.0, rel=0.01)
    
    def test_sprint_times_increase_with_distance(self):
        """Test that times increase with distance."""
        times = calculate_sprint_times(4.76)
        
        for i in range(len(times) - 1):
            assert times[i]["tiempo_segundos"] < times[i + 1]["tiempo_segundos"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict
import math

# Add parent directory to path to import the analyzers
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from satellite_trend_analyzer import SatelliteStage1Engine
    from atmospheric_anomaly_detector import AtmosphericStage2Engine
except ImportError:
    # Fallback if files don't exist
    SatelliteStage1Engine = None
    AtmosphericStage2Engine = None


class MultiStageFireDetector:   
    def __init__(self):
        self.stage1_engine = SatelliteStage1Engine() if SatelliteStage1Engine else None
        self.stage2_engine = AtmosphericStage2Engine() if AtmosphericStage2Engine else None
        
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points in kilometers"""
        R = 6371  # Earth radius in km
        
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def cluster_hotspots(self, hotspots, radius_km=1.0):
        """
        Group hotspots within 1 sq km (radius_km) into clusters
        """
        clusters = []
        processed = set()
        
        for i, hotspot in enumerate(hotspots):
            if i in processed:
                continue
                
            cluster = [hotspot]
            processed.add(i)
            
            for j, other in enumerate(hotspots):
                if j in processed:
                    continue
                    
                dist = self.haversine_distance(
                    hotspot['latitude'], hotspot['longitude'],
                    other['latitude'], other['longitude']
                )
                
                if dist <= radius_km:
                    cluster.append(other)
                    processed.add(j)
            
            clusters.append(cluster)
        
        return clusters
    
    def analyze_temporal_trend(self, cluster_history):
        """
        Analyze trend for Stage 1 confirmation (OPTIMIZED for 3 days)
        
        Conditions:
        - Gradual confidence increase over available days
        - Final confidence >= 90%
        - High confidence maintained for 24+ hours
        """
        if len(cluster_history) < 2:
            return {
                'confirmed': False,
                'reason': 'Insufficient data (need 2+ days)',
                'confidence_trend': []
            }
        
        # Sort by date
        sorted_history = sorted(cluster_history, key=lambda x: x['date'])
        
        # Get available days (at least 2)
        recent_days = sorted_history[-min(3, len(sorted_history)):]
        
        # Extract confidence values
        confidences = [day['avg_confidence'] for day in recent_days]
        
        # Check for gradual increase
        is_increasing = all(confidences[i] <= confidences[i+1] for i in range(len(confidences)-1))
        
        # Check final confidence >= 90%
        final_confidence = confidences[-1]
        high_confidence = final_confidence >= 90
        
        # Calculate trend slope
        if len(confidences) > 1:
            slope = (confidences[-1] - confidences[0]) / (len(confidences) - 1)
        else:
            slope = 0
        
        # Simplified: Just need increasing trend and high final confidence
        confirmed = is_increasing and high_confidence and slope > 5  # At least 5% increase per day
        
        return {
            'confirmed': confirmed,
            'final_confidence': final_confidence,
            'confidence_trend': confidences,
            'slope': slope,
            'is_increasing': is_increasing,
            'days_analyzed': len(recent_days)
        }
    
    def process_stage1(self, all_hotspots_by_day):
        """
        Process Stage 1: Satellite Trend Analysis
        
        Parameters:
        - all_hotspots_by_day: dict with keys as dates (YYYY-MM-DD) and values as list of hotspots
        
        Returns:
        - List of Stage 1 confirmed locations with metadata
        """
        stage1_confirmed = []
        
        # Flatten all hotspots
        all_hotspots = []
        for date, hotspots in all_hotspots_by_day.items():
            for h in hotspots:
                h['date'] = date
                all_hotspots.append(h)
        
        # Cluster by location (1 sq km)
        clusters = self.cluster_hotspots(all_hotspots, radius_km=1.0)
        
        for cluster in clusters:
            # Group by date
            by_date = defaultdict(list)
            for hotspot in cluster:
                by_date[hotspot['date']].append(hotspot)
            
            # Calculate daily averages
            daily_stats = []
            for date, hotspots in sorted(by_date.items()):
                avg_conf = sum(h['confidence'] for h in hotspots) / len(hotspots)
                avg_frp = sum(h.get('frp', 0) for h in hotspots) / len(hotspots)
                avg_brightness = sum(h.get('brightness', 0) for h in hotspots) / len(hotspots)
                
                daily_stats.append({
                    'date': date,
                    'avg_confidence': avg_conf,
                    'avg_frp': avg_frp,
                    'avg_brightness': avg_brightness,
                    'count': len(hotspots)
                })
            
            # Analyze trend
            trend_result = self.analyze_temporal_trend(daily_stats)
            
            if trend_result['confirmed']:
                # Get center point of cluster
                center_lat = sum(h['latitude'] for h in cluster) / len(cluster)
                center_lon = sum(h['longitude'] for h in cluster) / len(cluster)
                
                stage1_confirmed.append({
                    'latitude': center_lat,
                    'longitude': center_lon,
                    'confidence': trend_result['final_confidence'],
                    'trend': trend_result['confidence_trend'],
                    'slope': trend_result['slope'],
                    'hotspot_count': len(cluster),
                    'daily_stats': daily_stats,
                    'stage': 1,
                    'status': 'STAGE_1_CONFIRMED'
                })
        
        return stage1_confirmed
    
    def process_stage2(self, stage1_locations, atmospheric_data):
        """
        Process Stage 2: Atmospheric Verification
        
        Parameters:
        - stage1_locations: List of Stage 1 confirmed locations
        - atmospheric_data: Dict with coordinates as keys and atmospheric readings
        
        Returns:
        - List of Stage 2 confirmed locations
        """
        stage2_confirmed = []
        
        for location in stage1_locations:
            lat = location['latitude']
            lon = location['longitude']
            
            # Find matching atmospheric data (within 0.1 degree tolerance)
            atmo_key = f"{lat:.1f},{lon:.1f}"
            
            if atmo_key in atmospheric_data:
                atmo = atmospheric_data[atmo_key]
                
                # Check for atmospheric anomalies
                # Simplified version - in production use the full AtmosphericStage2Engine
                pm25_spike = atmo.get('pm2_5', 0) > atmo.get('pm2_5_baseline', 50) * 1.5
                co_spike = atmo.get('carbon_monoxide', 0) > atmo.get('co_baseline', 400) * 1.5
                temp_spike = atmo.get('temperature_2m', 0) > atmo.get('temp_baseline', 25) + 5
                
                spike_count = sum([pm25_spike, co_spike, temp_spike])
                
                if spike_count >= 2:  # At least 2 atmospheric indicators
                    stage2_confirmed.append({
                        **location,
                        'stage': 2,
                        'status': 'STAGE_2_CONFIRMED',
                        'atmospheric': atmo,
                        'spike_indicators': spike_count
                    })
        
        return stage2_confirmed
    
    def get_color_for_confidence(self, confidence, stage=0):
        """
        Get color based on confidence level and stage
        
        Returns: hex color code
        """
        if stage == 1:
            return '#FF8C00'  # Orange for Stage 1
        elif stage == 2:
            return '#4169E1'  # Professional blue for Stage 2
        elif stage == 3:
            return '#DC143C'  # Red for Stage 3
        else:
            # Gradient for unconfirmed hotspots
            if confidence < 60:
                return '#90EE90'  # Mild green (low)
            elif confidence < 80:
                return '#FFD700'  # Yellow (medium)
            else:
                # Gradient from yellow to orange as it approaches Stage 1
                # Linear interpolation between yellow and orange
                ratio = (confidence - 80) / 20  # 0 to 1 as conf goes 80 to 100
                return self.interpolate_color('#FFD700', '#FF8C00', ratio)
    
    def interpolate_color(self, color1, color2, ratio):
        """Interpolate between two hex colors"""
        c1 = tuple(int(color1[i:i+2], 16) for i in (1, 3, 5))
        c2 = tuple(int(color2[i:i+2], 16) for i in (1, 3, 5))
        
        r = int(c1[0] + (c2[0] - c1[0]) * ratio)
        g = int(c1[1] + (c2[1] - c1[1]) * ratio)
        b = int(c1[2] + (c2[2] - c1[2]) * ratio)
        
        return f'#{r:02x}{g:02x}{b:02x}'


# Singleton instance
detector = MultiStageFireDetector()

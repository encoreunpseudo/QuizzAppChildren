import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Button,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert
} from "react-native";
import * as FileSystem from "expo-file-system";
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

const userStatsPath = FileSystem.documentDirectory + 'user_stats.json';
const userAvatarPath = FileSystem.documentDirectory + 'user_avatar.jpg';

const ProfileScreen = () => {
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [statsData, setStatsData] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    accuracy: 0,
    streak: 0,
    lastActivity: null
  });

  // Cette fonction sera appelée chaque fois que l'écran obtient le focus
  useFocusEffect(
    useCallback(() => {
      console.log("ProfileScreen a obtenu le focus - rechargement des stats");
      loadUserStats();
      loadAvatar();
      return () => {
        // Nettoyage si nécessaire
      };
    }, [])
  );

  // useEffect initial
  useEffect(() => {
    loadUserStats();
    loadAvatar();
  }, []);

  const loadAvatar = async () => {
    try {
      const avatarExists = await FileSystem.getInfoAsync(userAvatarPath);
      if (avatarExists.exists) {
        setAvatar(userAvatarPath);
      }
    } catch (err) {
      console.error("Erreur lors du chargement de l'avatar:", err);
    }
  };

  const pickImage = async () => {
    try {
      // Demander la permission d'accéder à la galerie
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission refusée", "Vous devez autoriser l'accès à vos photos pour changer d'avatar.");
        return;
      }
      
      // Lancer le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Enregistrer l'image sélectionnée
        await FileSystem.copyAsync({
          from: selectedAsset.uri,
          to: userAvatarPath
        });
        
        // Mettre à jour l'état
        setAvatar(userAvatarPath);
      }
    } catch (err) {
      console.error("Erreur lors de la sélection de l'image:", err);
      Alert.alert("Erreur", "Impossible de charger l'image sélectionnée");
    }
  };

  const loadUserStats = async () => {
    try {
      setLoading(true);
      const statsExists = await FileSystem.getInfoAsync(userStatsPath);
      
      if (!statsExists.exists) {
        await FileSystem.writeAsStringAsync(userStatsPath, JSON.stringify([]));
        setLoading(false);
        return;
      }
      
      const content = await FileSystem.readAsStringAsync(userStatsPath);
      
      try {
        const stats = JSON.parse(content);
        setUserStats(stats);
        
        if (stats.length > 0) {
          calculateStats(stats);
        }
      } catch (parseError) {
        setError("Erreur de format dans le fichier de statistiques");
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Erreur lors du chargement des statistiques:", err);
      setError(`Impossible de charger les statistiques: ${err.message}`);
      setLoading(false);
    }
  };

  const calculateStats = (stats) => {
    try {
      // Trier par date pour les calculs de streak et dernière activité
      const sortedStats = [...stats].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      // Calcul des statistiques de base
      const totalQuestions = stats.length;
      const correctAnswers = stats.filter(stat => stat.isCorrect).length;
      const incorrectAnswers = totalQuestions - correctAnswers;
      const accuracy = totalQuestions > 0 
        ? Math.round((correctAnswers / totalQuestions) * 100) 
        : 0;
      
      // Dernière activité
      const lastActivity = sortedStats.length > 0 
        ? new Date(sortedStats[0].timestamp)
        : null;
      
      // Calcul du streak actuel (combien de bonnes réponses consécutives)
      let streak = 0;
      for (const stat of sortedStats) {
        if (stat.isCorrect) {
          streak++;
        } else {
          break;
        }
      }

      setStatsData({
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        accuracy,
        streak,
        lastActivity
      });
    } catch (error) {
      console.error("Erreur lors du calcul des statistiques:", error);
    }
  };

  const forceReload = () => {
    loadUserStats();
  };

  // Composant pour le cercle de pourcentage
  const AccuracyCircle = ({ percentage }) => {
    const radius = 60;
    const strokeWidth = 10;
    const size = radius * 2 + strokeWidth * 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={styles.accuracyCircleContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Cercle de fond */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Cercle de progression */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1927b6"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          />
          
          {/* Texte du pourcentage */}
          <SvgText
            x={size / 2-7}
            y={size / 2 + 8}
            fontSize="24"
            fontWeight="bold"
            fill="#1927b6"
            textAnchor="middle"
          >
            {percentage}%
          </SvgText>
        </Svg>
        <Text style={styles.accuracyLabel}>Précision</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Chargement des statistiques...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Mon Profil</Text>
          <Button title="Actualiser" onPress={forceReload} color="#ffffff" />
        </View>

        {/* Section Avatar */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>Ajouter photo</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>✏️</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          {/* Cercle de précision */}
          <AccuracyCircle percentage={statsData.accuracy} />
          
          <Text style={styles.sectionTitle}>Mes statistiques</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{statsData.totalQuestions}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{statsData.correctAnswers}</Text>
              <Text style={styles.statLabel}>Bonnes réponses</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{statsData.incorrectAnswers}</Text>
              <Text style={styles.statLabel}>Erreurs</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{statsData.streak}</Text>
              <Text style={styles.statLabel}>Série actuelle</Text>
            </View>
          </View>

          {statsData.lastActivity && (
            <View style={styles.lastActivityContainer}>
              <Text style={styles.lastActivityText}>
                Dernière activité: {statsData.lastActivity.toLocaleDateString()}
              </Text>
            </View>
          )}

          {userStats.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Tu n'as pas encore répondu à des questions.
                Commence à apprendre pour voir tes statistiques !
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1927b6",
  },
  container: {
    flex: 1,
    backgroundColor: "#1927b6",
  },
  contentContainer: {
    paddingBottom: 80,
    // Espace pour la barre de navigation
  },
  header: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginVertical: 10,
  },
  loadingText: {
    color: "#ffffff",
    marginTop: 10,
  },
  // Styles pour l'avatar
  avatarContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  avatarWrapper: {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#ffffff",
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e1e1e1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1927b6",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  editBadgeText: {
    fontSize: 14,
  },
  // Styles pour le cercle de précision
  accuracyCircleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  accuracyLabel: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#1927b6",
  },
  // Styles pour les statistiques
  statsContainer: {
    backgroundColor: "#ffffff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 16,
    color: "#333",
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statBox: {
    width: "48%",
    backgroundColor: "#f0f4ff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1927b6",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  lastActivityContainer: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  lastActivityText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
  error: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    margin: 20,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4ff",
    borderRadius: 8,
    marginTop: 16,
  },
  emptyStateText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  }
});

export default ProfileScreen;
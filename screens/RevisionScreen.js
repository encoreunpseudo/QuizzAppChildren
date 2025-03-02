import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Animated,
  StatusBar,
  SafeAreaView,
  Image,
  ScrollView
} from "react-native";
import * as FileSystem from "expo-file-system";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get("window");
const USER_STATS_PATH = FileSystem.documentDirectory + 'user_stats.json';
const QUESTION_TIMER_SECONDS = 20;
const HEADER_HEIGHT = 60;
const BOTTOM_TAB_HEIGHT = 180;
const AVAILABLE_HEIGHT = height - HEADER_HEIGHT - BOTTOM_TAB_HEIGHT;

// Composant de carte pour les thèmes
const ThemeCard = ({ theme, onPress, selectedThemes }) => {
  const isSelected = selectedThemes.includes(theme.id);
  
  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        isSelected && styles.themeCardSelected
      ]}
      onPress={() => onPress(theme.id)}
      activeOpacity={0.7}
    >
      <View style={styles.themeIconContainer}>
        <Image
          source={{ uri: theme.icon }}
          style={styles.themeIcon}
          defaultSource={{ uri: 'https://placehold.co/100x100/1927b6/FFF?text=Thème' }}
        />
      </View>
      <Text style={styles.themeTitle}>{theme.title}</Text>
      <View style={styles.themeProgressContainer}>
        <View style={[styles.themeProgressBar, { width: `${theme.progress}%` }]} />
      </View>
      <Text style={styles.themeProgressText}>{theme.progress}% maîtrisé</Text>
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Composant d'accomplissement
const AchievementBadge = ({ achievement }) => {
  return (
    <View style={[styles.achievementBadge, !achievement.unlocked && styles.achievementLocked]}>
      <Image
        source={{ uri: achievement.icon }}
        style={[styles.achievementIcon, !achievement.unlocked && styles.achievementIconLocked]}
      />
      <Text style={styles.achievementTitle}>{achievement.title}</Text>
      {!achievement.unlocked && (
        <View style={styles.achievementLockOverlay}>
          <Ionicons name="lock-closed" size={24} color="#ffffff" />
        </View>
      )}
    </View>
  );
};

// Composant principal de l'écran de révision
const RevisionScreen = ({ navigation }) => {
  const [themes, setThemes] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [incorrectQuestionsOnly, setIncorrectQuestionsOnly] = useState(false);
  const [isStartButtonActive, setIsStartButtonActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState([]);
  const [streakDays, setStreakDays] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  
  const startButtonAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  
  useFocusEffect(
    React.useCallback(() => {
      console.log("RevisionScreen a obtenu le focus");
      loadUserStats();
      return () => {};
    }, [])
  );
  
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        await Promise.all([fetchThemes(), loadUserStats(), fetchAchievements()]);
        calculateStreakAndProgress();
      } catch (err) {
        console.error("Erreur dans l'initialisation :", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    initializeScreen();
  }, []);
  
  useEffect(() => {
    // Vérifier si le bouton de démarrage doit être actif
    const shouldBeActive = selectedThemes.length > 0;
    setIsStartButtonActive(shouldBeActive);
    
    // Animer le bouton de démarrage
    Animated.timing(startButtonAnim, {
      toValue: shouldBeActive ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [selectedThemes]);
  
  const fetchThemes = async () => {
    try {
      // Simulation d'une récupération de thèmes depuis une API
      // À adapter selon votre API réelle
      const response = await fetch('http://0.0.0.0:8000/themes');
      if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
      
      const jsonData = await response.json();
      setThemes(jsonData);
    } catch (err) {
      console.error("Erreur lors de la récupération des thèmes:", err);
      // Données de démonstration en cas d'erreur
      setThemes([
        { id: 1, title: "Mathématiques", icon: "https://placehold.co/100x100/FFD700/FFF?text=Math", progress: 65 },
        { id: 2, title: "Sciences", icon: "https://placehold.co/100x100/4CAF50/FFF?text=Science", progress: 48 },
        { id: 3, title: "Histoire", icon: "https://placehold.co/100x100/2196F3/FFF?text=Histoire", progress: 72 },
        { id: 4, title: "Géographie", icon: "https://placehold.co/100x100/9C27B0/FFF?text=Géo", progress: 35 },
        { id: 5, title: "Français", icon: "https://placehold.co/100x100/F44336/FFF?text=FR", progress: 89 },
      ]);
    }
  };
  
  const fetchAchievements = async () => {
    try {
      // Simulation d'une récupération d'accomplissements depuis une API
      const response = await fetch('http://0.0.0.0:8000/achievements');
      if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
      
      const jsonData = await response.json();
      setAchievements(jsonData);
    } catch (err) {
      console.error("Erreur lors de la récupération des accomplissements:", err);
      // Données de démonstration en cas d'erreur
      setAchievements([
        { id: 1, title: "3 jours consécutifs", icon: "https://placehold.co/60x60/FFD700/FFF?text=3j", unlocked: true },
        { id: 2, title: "Série de 5 bonnes réponses", icon: "https://placehold.co/60x60/4CAF50/FFF?text=5✓", unlocked: true },
        { id: 3, title: "Champion de math", icon: "https://placehold.co/60x60/2196F3/FFF?text=Math", unlocked: false },
        { id: 4, title: "10 jours consécutifs", icon: "https://placehold.co/60x60/9C27B0/FFF?text=10j", unlocked: false },
      ]);
    }
  };
  
  
  const loadUserStats = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(USER_STATS_PATH);
      if (!fileInfo.exists) {
        await FileSystem.writeAsStringAsync(USER_STATS_PATH, JSON.stringify([]));
        setUserStats([]);
        return;
      }
      
      const content = await FileSystem.readAsStringAsync(USER_STATS_PATH);
      const parsedStats = JSON.parse(content);
      console.log(`Stats chargées: ${parsedStats.length} entrées`);
      setUserStats(Array.isArray(parsedStats) ? parsedStats : []);
    } catch (err) {
      console.error("Erreur lors de la lecture des stats", err);
      setUserStats([]);
    }
  };
  
  const calculateStreakAndProgress = () => {
    // Calculer les jours de streak
    const uniqueDays = new Set();
    const lastSevenDays = [];
    const now = new Date();
    
    // Calculer les 7 derniers jours
    for (let i = 0; i < 7; i++) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      lastSevenDays.push(day.toISOString().split('T')[0]);
    }
    
    // Trouver les jours uniques où l'utilisateur a répondu à des questions
    userStats.forEach(stat => {
      const statDate = new Date(stat.timestamp).toISOString().split('T')[0];
      uniqueDays.add(statDate);
    });
    
    // Calculer le nombre de jours consécutifs (streak)
    let streak = 0;
    for (let i = 0; i < lastSevenDays.length; i++) {
      if (uniqueDays.has(lastSevenDays[i])) {
        streak++;
      } else if (i === 0) {
        // Si aujourd'hui n'a pas d'activité, vérifier hier
        continue;
      } else {
        // Casser la série dès qu'un jour est manqué
        break;
      }
    }
    
    setStreakDays(streak);
    
    // Calculer le pourcentage de progrès hebdomadaire
    const weeklyCompleted = userStats.filter(stat => {
      const statDate = new Date(stat.timestamp);
      const daysAgo = Math.floor((now - statDate) / (1000 * 60 * 60 * 24));
      return daysAgo < 7;
    }).length;
    
    const targetWeeklyQuestions = 50; // Objectif hebdomadaire arbitraire
    const progress = Math.min(Math.round((weeklyCompleted / targetWeeklyQuestions) * 100), 100);
    setWeeklyProgress(progress);
  };
  
  const toggleThemeSelection = (themeId) => {
    setSelectedThemes(prev => {
      if (prev.includes(themeId)) {
        return prev.filter(id => id !== themeId);
      } else {
        return [...prev, themeId];
      }
    });
  };
  
  const toggleIncorrectQuestions = () => {
    setIncorrectQuestionsOnly(prev => !prev);
  };
  
  const startRevision = () => {
    // Créer un effet confetti pour la gamification
    Animated.sequence([
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(confettiAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    
    // Naviguer vers l'écran de quiz avec les paramètres sélectionnés
    navigation.navigate('RevisionQuiz', {
      themes: selectedThemes,
      incorrectOnly: incorrectQuestionsOnly
    });
  };
  
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Chargement de tes révisions...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchThemes()}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1927b6" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Révisions</Text>
        <View style={styles.streakContainer}>
          <Ionicons name="flame" size={20} color="#FFD700" />
          <Text style={styles.streakText}>{streakDays} jours</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        {/* Section de progression hebdomadaire */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Ta progression cette semaine</Text>
          <View style={styles.weeklyProgressContainer}>
            <View style={styles.weeklyProgressBarOuter}>
              <View style={[styles.weeklyProgressBarInner, { width: `${weeklyProgress}%` }]} />
            </View>
            <Text style={styles.weeklyProgressText}>{weeklyProgress}%</Text>
          </View>
        </View>
        
        {/* Section des accomplissements */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Tes médailles</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScrollView}>
            {achievements.map(achievement => (
              <AchievementBadge key={achievement.id} achievement={achievement} />
            ))}
          </ScrollView>
        </View>
        
        {/* Section de sélection de thèmes */}
        <View style={styles.themesSection}>
          <Text style={styles.sectionTitle}>Choisis tes thèmes</Text>
          <View style={styles.themesGrid}>
            {themes.map(theme => (
              <ThemeCard 
                key={theme.id} 
                theme={theme} 
                onPress={toggleThemeSelection}
                selectedThemes={selectedThemes}
              />
            ))}
          </View>
        </View>
        
        {/* Section des options de révision */}
        <View style={styles.optionsSection}>
          <TouchableOpacity 
            style={[styles.optionButton, incorrectQuestionsOnly && styles.optionButtonSelected]}
            onPress={toggleIncorrectQuestions}
          >
            <Ionicons 
              name={incorrectQuestionsOnly ? "checkbox" : "square-outline"} 
              size={24} 
              color={incorrectQuestionsOnly ? "#ffffff" : "#1927b6"} 
            />
            <Text style={[styles.optionText, incorrectQuestionsOnly && styles.optionTextSelected]}>
              Revoir tes erreurs uniquement
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Bouton de démarrage */}
        <Animated.View style={[
          styles.startButtonContainer,
          {
            opacity: startButtonAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1]
            }),
            transform: [
              { scale: startButtonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1.05]
              })},
              { translateY: startButtonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -5]
              })}
            ]
          }
        ]}>
          <TouchableOpacity 
            style={[styles.startButton, !isStartButtonActive && styles.startButtonDisabled]}
            onPress={startRevision}
            disabled={!isStartButtonActive}
            activeOpacity={0.7}
          >
            <Text style={styles.startButtonText}>Commencer la révision</Text>
            <Ionicons name="arrow-forward-circle" size={24} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
        
        {/* Effet confetti pour la gamification */}
        <Animated.View style={[
          styles.confettiContainer,
          {
            opacity: confettiAnim,
            transform: [{ translateY: confettiAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -100]
            })}]
          }
        ]}>
          {Array.from({ length: 20 }).map((_, index) => (
            <View 
              key={index}
              style={[
                styles.confetti,
                { 
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4CAF50', '#2196F3', '#9C27B0'][Math.floor(Math.random() * 5)],
                  transform: [{ rotate: `${Math.random() * 360}deg` }],
                  width: Math.random() * 10 + 5,
                  height: Math.random() * 10 + 5
                }
              ]}
            />
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1927b6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#1621a0",
    height: HEADER_HEIGHT,
    zIndex: 10,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakText: {
    color: "#ffffff",
    fontWeight: "bold",
    marginLeft: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: BOTTOM_TAB_HEIGHT,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1927b6",
    padding: 20,
  },
  loadingText: {
    color: "#ffffff",
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#1927b6",
    fontWeight: "bold",
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    marginLeft: 5,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 20,
  },
  weeklyProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  weeklyProgressBarOuter: {
    flex: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    overflow: "hidden",
  },
  weeklyProgressBarInner: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 8,
  },
  weeklyProgressText: {
    color: "#ffffff",
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 16,
  },
  achievementsSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  achievementsScrollView: {
    flexDirection: "row",
    marginBottom: 15,
  },
  achievementBadge: {
    width: 100,
    height: 120,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginRight: 15,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementLocked: {
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  achievementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  achievementIconLocked: {
    opacity: 0.5,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  achievementLockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  themesSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  themesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  themeCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 15,
    padding: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  themeCardSelected: {
    backgroundColor: "#f0f4ff",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  themeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  themeIcon: {
    width: "100%",
    height: "100%",
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#333",
  },
  themeProgressContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginBottom: 5,
    overflow: "hidden",
  },
  themeProgressBar: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  themeProgressText: {
    fontSize: 12,
    color: "#666",
  },
  selectedBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#1927b6",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  optionButtonSelected: {
    backgroundColor: "#1927b6",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  optionTextSelected: {
    color: "#ffffff",
  },
  startButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  startButtonDisabled: {
    backgroundColor: "#B0B0B0",
    elevation: 2,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  },
  confettiContainer: {
    position: "absolute",
    top: height,
    left: 0,
    right: 0,
    height: 200,
    pointerEvents: "none",
  },
  confetti: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "#FFD700",
  }
});

export default RevisionScreen;
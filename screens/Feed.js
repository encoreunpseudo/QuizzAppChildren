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
  ScrollView
} from "react-native";
import * as FileSystem from "expo-file-system";
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get("window");
const USER_STATS_PATH = FileSystem.documentDirectory + 'user_stats.json';
const HEADER_HEIGHT = 60;
const BOTTOM_TAB_HEIGHT = 180; // Ajustez selon la hauteur réelle de votre TabBar
const AVAILABLE_HEIGHT = height - HEADER_HEIGHT - BOTTOM_TAB_HEIGHT;

// Composant de question style feed infini - sans chronomètre
const QuizQuestion = ({ 
  question, 
  options, 
  correctAnswerKey, 
  onAnswer
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const scaleAnim = useRef(options.map(() => new Animated.Value(1))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true
    }).start();
  }, []);

  useEffect(() => {
    // Réinitialiser l'état quand la question change
    setSelectedAnswer(null);
    setIsAnswered(false);
    resultAnim.setValue(0);
    
    options.forEach((_, index) => {
      scaleAnim[index].setValue(1);
    });
  }, [question]);

  const handleAnswer = (key, index) => {
    if (isAnswered) return;
    
    setSelectedAnswer(key);
    setIsAnswered(true);
    
    // Animation de pression
    Animated.sequence([
      Animated.timing(scaleAnim[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
    
    // Animation du résultat
    Animated.timing(resultAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true
    }).start();
    
    // Appeler la fonction de callback avec la réponse
    onAnswer(key);
  };

  const getOptionStyle = (key) => {
    if (!isAnswered) {
      return styles.optionButton;
    }
    
    if (key === correctAnswerKey) {
      return [styles.optionButton, styles.correctOption];
    }
    
    if (key === selectedAnswer && key !== correctAnswerKey) {
      return [styles.optionButton, styles.incorrectOption];
    }
    
    return [styles.optionButton, { opacity: 0.7 }];
  };

  return (
    <View style={styles.questionContainerWrapper}>
      <Animated.View style={[
        styles.questionCard,
        { opacity: fadeAnim }
      ]}>
        <ScrollView contentContainerStyle={styles.questionContent}>
          <Text style={styles.questionText}>{question}</Text>
          
          <View style={styles.optionsContainer}>
            {options.map(([key, value], index) => (
              <Animated.View 
                key={key}
                style={{ 
                  transform: [{ scale: scaleAnim[index] }],
                  width: '100%'
                }}
              >
                <TouchableOpacity
                  style={getOptionStyle(key)}
                  onPress={() => handleAnswer(key, index)}
                  disabled={isAnswered}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionText}>{value}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
        
        {isAnswered && (
          <Animated.View 
            style={[
              styles.resultContainer,
              { 
                opacity: resultAnim,
                transform: [{ 
                  translateY: resultAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}
          >
            <View style={[
              styles.resultBadge,
              selectedAnswer === correctAnswerKey ? styles.correctBadge : styles.incorrectBadge
            ]}>
              <Text style={styles.resultText}>
                {selectedAnswer === correctAnswerKey 
                  ? "Correct ✅" 
                  : "Incorrect 😕"
                }
              </Text>
            </View>
            
            {selectedAnswer !== correctAnswerKey && (
              <Text style={styles.correctAnswerText}>
                La bonne réponse était: {options.find(([key]) => key === correctAnswerKey)[1]}
              </Text>
            )}
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

const FeedScreen = ({ navigation }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState([]);
  const [viewedQuestions, setViewedQuestions] = useState(new Set());
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreQuestions, setHasMoreQuestions] = useState(true);
  const flatListRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      console.log("FeedScreen a obtenu le focus");
      loadUserStats();
      return () => {};
    }, [])
  );

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeFiles();
        await Promise.all([fetchQuestions(1), loadUserStats()]);
      } catch (err) {
        console.error("Erreur dans l'initialisation :", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    initializeApp();
    
    // Détecteur de changement d'orientation
    const updateLayout = () => {
      // Force un re-render pour actualiser les dimensions
      setQuestions(prev => [...prev]);
    };
    
    const dimensionsListener = Dimensions.addEventListener('change', updateLayout);
    
    return () => {
      dimensionsListener.remove(); // Pour les versions récentes de React Native
    };
  }, []);

  const initializeFiles = async () => {
    try {
      const statsExists = await FileSystem.getInfoAsync(USER_STATS_PATH);
      if (!statsExists.exists) {
        await FileSystem.writeAsStringAsync(USER_STATS_PATH, JSON.stringify([]));
        console.log("Fichier stats créé !");
      }
    } catch (err) {
      console.error("Erreur lors de l'initialisation des fichiers", err);
      throw err;
    }
  };

  const fetchQuestions = async (pageNumber) => {
    try {
      // Simulation d'une API paginée - à adapter selon votre API réelle
      const response = await fetch(`http://0.0.0.0:8000/questions?page=${pageNumber}`);
      if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
      
      const jsonData = await response.json();
      
      if (pageNumber === 1) {
        setQuestions(jsonData);
      } else {
        setQuestions(prev => [...prev, ...jsonData]);
      }
      
      setHasMoreQuestions(jsonData.length > 0);
    } catch (err) {
      setError("Impossible de charger les questions: " + err.message);
      throw err;
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMoreQuestions = async () => {
    if (isLoadingMore || !hasMoreQuestions) return;
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    
    try {
      await fetchQuestions(nextPage);
    } catch (err) {
      console.error("Erreur lors du chargement de plus de questions:", err);
    } finally {
      setIsLoadingMore(false);
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

  const saveUserAnswer = async (questionId, userAnswer, correctAnswer) => {
    try {
      setViewedQuestions(prev => new Set(prev).add(questionId));
      
      const fileInfo = await FileSystem.getInfoAsync(USER_STATS_PATH);
      let currentStats = [];
      
      if (fileInfo.exists) {
        try {
          const statsContent = await FileSystem.readAsStringAsync(USER_STATS_PATH);
          const parsedContent = JSON.parse(statsContent);
          currentStats = Array.isArray(parsedContent) ? parsedContent : [];
        } catch (parseError) {
          console.error("Erreur de parsing du fichier stats:", parseError);
          currentStats = [];
        }
      }
  
      const newStat = {
        questionId,
        userAnswer,
        correctAnswer,
        isCorrect: userAnswer === correctAnswer,
        timestamp: new Date().toISOString()
      };
      
      const updatedStats = [...currentStats, newStat];
      
      await FileSystem.writeAsStringAsync(
        USER_STATS_PATH,
        JSON.stringify(updatedStats)
      );
      
      console.log(`Réponse sauvegardée. Total: ${updatedStats.length} stats`);
      setUserStats(updatedStats);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de la réponse:", err);
    }
  };

  const renderQuestion = ({ item }) => {
    return (
      <View style={[styles.questionPage, { height: AVAILABLE_HEIGHT }]}>
        <QuizQuestion
          question={item.question}
          options={Object.entries(item.answers)}
          correctAnswerKey={item.correct_answer}
          onAnswer={(userAnswer) => 
            saveUserAnswer(item.id, userAnswer, item.correct_answer)
          }
        />
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loaderFooter}>
        <ActivityIndicator size="small" color="#ffffff" />
        <Text style={styles.loaderText}>Chargement...</Text>
      </View>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const questionId = viewableItems[0].item.id;
      
      if (!viewedQuestions.has(questionId)) {
        console.log(`Question ${questionId} est maintenant visible`);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchQuestions(1)}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyText}>Aucune question disponible</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchQuestions(1)}
        >
          <Text style={styles.retryButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1927b6" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quiz</Text>
        {navigation && (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileButtonText}>Profil</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        ref={flatListRef}
        data={questions}
        renderItem={renderQuestion}
        keyExtractor={(item) => `${item.id}`}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={AVAILABLE_HEIGHT}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onEndReached={loadMoreQuestions}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ 
          paddingBottom: BOTTOM_TAB_HEIGHT // Ajoute un padding pour éviter que le contenu ne soit sous la TabBar
        }}
      />
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
  profileButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  profileButtonText: {
    color: "#1927b6",
    fontWeight: "bold",
  },
  questionPage: {
    width: width,
    justifyContent: "center",
    alignItems: "center",
  },
  questionContainerWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "100%",
    height: "80%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    display: "flex",
    flexDirection: "column",
  },
  questionContent: {
    paddingVertical: 30,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
  },
  questionText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 40,
    textAlign: "center",
  },
  optionsContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: "#f0f4ff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#1927b6",
    shadowColor: "#1927b6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  correctOption: {
    backgroundColor: "#e0f7e0",
    borderColor: "#4CAF50",
  },
  incorrectOption: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
  },
  optionText: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
  },
  resultContainer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  resultBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  correctBadge: {
    backgroundColor: "#4CAF50",
  },
  incorrectBadge: {
    backgroundColor: "#f44336",
  },
  resultText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  correctAnswerText: {
    color: "#333",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
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
  emptyText: {
    color: "#ffffff",
    fontSize: 18,
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
  loaderFooter: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    color: "#ffffff",
    marginTop: 10,
  }
});

export default FeedScreen;
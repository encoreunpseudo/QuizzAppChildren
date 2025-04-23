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
const HEADER_HEIGHT = 50;
const BOTTOM_TAB_HEIGHT = 180;
const AVAILABLE_HEIGHT = height - HEADER_HEIGHT - BOTTOM_TAB_HEIGHT-30;

// Composant de révision de question
const RevisionQuestion = ({ 
  question, 
  options, 
  correctAnswerKey, 
  onAnswer,
  questionNumber,
  totalQuestions 
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [celebrateCorrect, setCelebrateCorrect] = useState(false);
  
  const scaleAnim = useRef(options.map(() => new Animated.Value(1))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;
  const celebrateAnim = useRef(new Animated.Value(0)).current;

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
    setShowHint(false);
    setCelebrateCorrect(false);
    resultAnim.setValue(0);
    hintAnim.setValue(0);
    celebrateAnim.setValue(0);
    
    options.forEach((_, index) => {
      scaleAnim[index].setValue(1);
    });
  }, [question]);

  const handleAnswer = (key, index) => {
    if (isAnswered) return;
    
    const isCorrect = key === correctAnswerKey;
    
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

    // Si c'est correct, lancer l'animation de célébration
    if (isCorrect) {
      setCelebrateCorrect(true);
      Animated.sequence([
        Animated.timing(celebrateAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.delay(1500),
        Animated.timing(celebrateAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true
        })
      ]).start();
    }
    
    // Attendre un peu avant de passer à la question suivante
    setTimeout(() => {
      onAnswer(key, isCorrect);
    }, isCorrect ? 2000 : 1500);
  };

  const toggleHint = () => {
    setShowHint(!showHint);
    Animated.timing(hintAnim, {
      toValue: !showHint ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const getHint = () => {
    // Simple hint: first letter of correct answer
    const correctOption = options.find(([key]) => key === correctAnswerKey);
    if (correctOption) {
      const correctText = correctOption[1];
      return `La réponse commence par "${correctText.charAt(0).toUpperCase()}"`;
    }
    return "Regarde bien toutes les options!";
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
      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarOuter}>
          <View 
            style={[
              styles.progressBarInner, 
              { width: `${((questionNumber + 1) / totalQuestions) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Question {questionNumber + 1} sur {totalQuestions}
        </Text>
      </View>

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

          {/* Bouton d'indice */}
          {!isAnswered && (
            <TouchableOpacity
              style={styles.hintButton}
              onPress={toggleHint}
              activeOpacity={0.7}
            >
              <Ionicons name="bulb-outline" size={24} color="#FFD700" />
              <Text style={styles.hintButtonText}>
                Besoin d'un indice?
              </Text>
            </TouchableOpacity>
          )}

          {/* Indice */}
          <Animated.View 
            style={[
              styles.hintContainer, 
              { 
                opacity: hintAnim,
                transform: [{ 
                  translateY: hintAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}
          >
            {showHint && (
              <Text style={styles.hintText}>{getHint()}</Text>
            )}
          </Animated.View>
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
                  ? "Bravo! C'est correct! 🎉" 
                  : "Pas tout à fait... 🤔"
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

      {/* Animation de célébration pour réponses correctes */}
      {celebrateCorrect && (
        <Animated.View 
          style={[
            styles.celebrationContainer,
            { opacity: celebrateAnim }
          ]}
        >
          {Array.from({ length: 20 }).map((_, index) => (
            <Animated.View 
              key={index}
              style={[
                styles.confetti,
                { 
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4CAF50', '#2196F3', '#9C27B0'][Math.floor(Math.random() * 5)],
                  transform: [
                    { translateY: celebrateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.random() * 200 - 100]
                    })},
                    { rotate: `${Math.random() * 360}deg` }
                  ],
                  width: Math.random() * 10 + 5,
                  height: Math.random() * 10 + 5
                }
              ]}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
};

// Composant d'écran de fin de session
const RevisionComplete = ({ 
  score, 
  totalQuestions, 
  correctAnswers, 
  onRestart, 
  onGoBack 
}) => {
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const starAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Animation d'entrée
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
    
    // Animation des étoiles
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(starAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  // Déterminer le message et le nombre d'étoiles en fonction du score
  const getMessage = () => {
    if (percentage >= 90) return "Extraordinaire! Tu es un champion!";
    if (percentage >= 70) return "Super! Tu as très bien réussi!";
    if (percentage >= 50) return "Bien joué! Continue comme ça!";
    return "Continue tes efforts, tu vas y arriver!";
  };
  
  const getStars = () => {
    if (percentage >= 90) return 3;
    if (percentage >= 70) return 2;
    if (percentage >= 50) return 1;
    return 0;
  };
  
  const stars = getStars();
  
  return (
    <Animated.View 
      style={[
        styles.completeContainer,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.completeCard}>
        <Text style={styles.completeTitle}>Révision terminée!</Text>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{percentage}%</Text>
          <Text style={styles.scoreSubtext}>
            {correctAnswers} sur {totalQuestions} questions correctes
          </Text>
        </View>
        
        <Animated.View 
          style={[
            styles.starsContainer,
            {
              transform: [{ 
                scale: starAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1]
                })
              }]
            }
          ]}
        >
          {[1, 2, 3].map(i => (
            <Ionicons 
              key={i}
              name={i <= stars ? "star" : "star-outline"} 
              size={50} 
              color={i <= stars ? "#FFD700" : "#dddddd"} 
              style={styles.starIcon}
            />
          ))}
        </Animated.View>
        
        <Text style={styles.completeMessage}>{getMessage()}</Text>
        
        <View style={styles.completeButtonsContainer}>
          <TouchableOpacity 
            style={[styles.completeButton, styles.restartButton]}
            onPress={onRestart}
          >
            <Ionicons name="refresh" size={24} color="#ffffff" />
            <Text style={styles.completeButtonText}>Recommencer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.completeButton, styles.backButton]}
            onPress={onGoBack}
          >
            <Ionicons name="arrow-back" size={24} color="#1927b6" />
            <Text style={[styles.completeButtonText, { color: "#1927b6" }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// Écran principal de révision
const RevisionScreen = ({ navigation, route }) => {
  // Extraire les thèmes et les options supplémentaires des paramètres de la route (si fournis)
  const { themes, incorrectOnly } = route?.params || { themes: [], incorrectOnly: false };
  
  const [revisionQuestions, setRevisionQuestions] = useState([]);
  const [selectedThemes, setSelectedThemes] = useState(themes || []);
  const [incorrectQuestionsOnly, setIncorrectQuestionsOnly] = useState(incorrectOnly || false);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [incorrectAnswers, setIncorrectAnswers] = useState([]);
  const [revisionComplete, setRevisionComplete] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState([]);
  
  const slideAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      console.log("RevisionScreen a obtenu le focus");
      loadUserStats();
      return () => {};
    }, [])
  );

  useEffect(() => {
    const initializeRevision = async () => {
      try {
        await Promise.all([fetchRevisionQuestions(), loadUserStats()]);
      } catch (err) {
        console.error("Erreur dans l'initialisation de la révision:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    initializeRevision();
  }, []);

  const fetchRevisionQuestions = async () => {
    try {
      // Tentative de récupération des questions de l'API
      let questions = [];
      
      try {
        // Construire l'URL avec les paramètres de filtrage si nécessaire
        let url = 'http://0.0.0.0:8000/questions';
        if (selectedThemes.length > 0 || incorrectQuestionsOnly) {
          url += '?';
          const params = [];
          if (selectedThemes.length > 0) {
            params.push(`themes=${selectedThemes.join(',')}`);
          }
          if (incorrectQuestionsOnly) {
            params.push('incorrectOnly=true');
          }
          url += params.join('&');
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        questions = await response.json();
      } catch (apiError) {
        console.error("Erreur de l'API:", apiError);
        
        // En cas d'échec de l'API, utiliser les questions de sauvegarde
        questions = [
          {
            id: 1,
            theme: "Mathématiques",
            question: "Combien font 7 + 8?",
            answers: { a: "13", b: "14", c: "15", d: "16" },
            correct_answer: "c"
          },
          {
            id: 2,
            theme: "Sciences",
            question: "Quelle planète est la plus proche du Soleil?",
            answers: { a: "Vénus", b: "Terre", c: "Mars", d: "Mercure" },
            correct_answer: "d"
          },
          {
            id: 3,
            theme: "Géographie",
            question: "Quelle est la capitale de la France?",
            answers: { a: "Londres", b: "Berlin", c: "Paris", d: "Madrid" },
            correct_answer: "c"
          },
          {
            id: 4,
            theme: "Histoire",
            question: "Qui a peint la Joconde?",
            answers: { a: "Van Gogh", b: "Léonard de Vinci", c: "Pablo Picasso", d: "Michel-Ange" },
            correct_answer: "b"
          },
          {
            id: 5,
            theme: "Français",
            question: "Quel mot est un verbe?",
            answers: { a: "Maison", b: "Courir", c: "Beau", d: "Vite" },
            correct_answer: "b"
          }
        ];
      }
      
      // Filtrer si nécessaire
      if (selectedThemes.length > 0) {
        questions = questions.filter(q => selectedThemes.includes(q.theme));
      }
      
      if (incorrectQuestionsOnly && userStats.length > 0) {
        const incorrectIds = userStats
          .filter(stat => !stat.isCorrect)
          .map(stat => stat.questionId);
        
        questions = questions.filter(q => incorrectIds.includes(q.id));
      }
      
      // Mélanger les questions
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      
      // Limiter à 10 questions maximum
      const limitedQuestions = shuffled.slice(0, 10);
      
      setRevisionQuestions(limitedQuestions);
      
      // Réinitialiser l'état de la révision
      setCurrentQuestionIndex(0);
      setScore(0);
      setCorrectAnswers([]);
      setIncorrectAnswers([]);
      setRevisionComplete(false);
    } catch (err) {
      console.error("Erreur lors de la récupération des questions:", err);
      setError("Impossible de charger les questions de révision");
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

  const saveUserAnswer = async (questionId, userAnswer, correctAnswer, isCorrect) => {
    try {
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
        isCorrect,
        timestamp: new Date().toISOString(),
        isRevision: true // Marquer comme une réponse de révision
      };
      
      const updatedStats = [...currentStats, newStat];
      
      await FileSystem.writeAsStringAsync(
        USER_STATS_PATH,
        JSON.stringify(updatedStats)
      );
      
      console.log(`Réponse de révision sauvegardée. Total: ${updatedStats.length} stats`);
      setUserStats(updatedStats);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de la réponse:", err);
    }
  };

  const handleAnswer = (userAnswer, isCorrect) => {
    const currentQuestion = revisionQuestions[currentQuestionIndex];
    
    // Mettre à jour le score et les tableaux de réponses
    if (isCorrect) {
      setScore(prevScore => prevScore + 1);
      setCorrectAnswers(prev => [...prev, currentQuestion.id]);
    } else {
      setIncorrectAnswers(prev => [...prev, currentQuestion.id]);
    }
    
    // Sauvegarder la réponse
    saveUserAnswer(
      currentQuestion.id,
      userAnswer,
      currentQuestion.correct_answer,
      isCorrect
    );
    
    // Passer à la question suivante avec animation
    if (currentQuestionIndex < revisionQuestions.length - 1) {
      // Animation de slide out
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true
      }).start(() => {
        // Changer la question
        setCurrentQuestionIndex(prev => prev + 1);
        
        // Réinitialiser l'animation
        slideAnim.setValue(width);
        
        // Animation de slide in pour la nouvelle question
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }).start();
      });
    } else {
      // La révision est terminée
      setRevisionComplete(true);
    }
  };

  const restartRevision = () => {
    // Réinitialiser la révision avec les mêmes questions mais mélangées
    const shuffled = [...revisionQuestions].sort(() => Math.random() - 0.5);
    setRevisionQuestions(shuffled);
    setCurrentQuestionIndex(0);
    setScore(0);
    setCorrectAnswers([]);
    setIncorrectAnswers([]);
    setRevisionComplete(false);
    slideAnim.setValue(0);
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Préparation de tes révisions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchRevisionQuestions}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (revisionQuestions.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyText}>Aucune question disponible pour cette révision</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (revisionComplete) {
    return (
      <RevisionComplete 
        score={score}
        totalQuestions={revisionQuestions.length}
        correctAnswers={correctAnswers.length}
        onRestart={restartRevision}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  const currentQuestion = revisionQuestions[currentQuestionIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1927b6" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Révision</Text>
        <View style={{ width: 24 }} /> {/* Spacer pour l'alignement */}
      </View>
      
      <Animated.View 
        style={[
          styles.questionContainer,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <RevisionQuestion
          question={currentQuestion.question}
          options={Object.entries(currentQuestion.answers)}
          correctAnswerKey={currentQuestion.correct_answer}
          questionNumber={currentQuestionIndex}
          totalQuestions={revisionQuestions.length}
          onAnswer={handleAnswer}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:1,
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
  backButton: {
    padding: 8,
  },
  questionContainer: {
    flex: 1,
  },
  questionContainerWrapper: {
    width: "100%",
    height: "94%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  progressContainer: {
    width: "100%",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  progressBarOuter: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarInner: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 5,
  },
  progressText: {
    color: "#ffffff",
    fontSize: 14,
    textAlign: "right",
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "100%",
    height: "90%",
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
    marginBottom: 30,
    textAlign: "center",
  },
  optionsContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
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
  hintButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  hintButtonText: {
    color: "#666",
    fontSize: 16,
    marginLeft: 8,
  },
  hintContainer: {
    marginTop: 5,
    padding: 10,
    backgroundColor: "#FFF9C4",
    borderRadius: 12,
    width: "100%",
  },
  hintText: {
    fontSize: 16,
    color: "#FF8F00",
    textAlign: "center",
    fontStyle: "italic",
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
  celebrationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  confetti: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "#FFD700",
  },
  
  // Styles pour l'écran de résultat à la fin
  completeContainer: {
    flex: 1,
    backgroundColor: "#1927b6",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  completeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "100%",
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1927b6",
    marginBottom: 20,
    textAlign: "center",
  },
  scoreContainer: {
    alignItems: "center",
    marginVertical: 15,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#1927b6",
  },
  scoreSubtext: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
  },
  starIcon: {
    marginHorizontal: 5,
  },
  completeMessage: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  completeButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    width: "45%",
  },
  restartButton: {
    backgroundColor: "#4CAF50",
  },
  backButton: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#1927b6",
  },
  completeButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  
  // Styles généraux
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
});

export default RevisionScreen;
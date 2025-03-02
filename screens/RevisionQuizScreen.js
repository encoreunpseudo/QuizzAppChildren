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
  Image
} from "react-native";
import * as FileSystem from "expo-file-system";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get("window");
const USER_STATS_PATH = FileSystem.documentDirectory + 'user_stats.json';
const QUESTION_TIMER_SECONDS = 20;
const HEADER_HEIGHT = 60;
const BOTTOM_TAB_HEIGHT = 80;
const AVAILABLE_HEIGHT = height - HEADER_HEIGHT - BOTTOM_TAB_HEIGHT;

// Composant de progression
const ProgressBar = ({ currentQuestion, totalQuestions }) => {
  const progress = (currentQuestion / totalQuestions) * 100;
  
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{currentQuestion}/{totalQuestions}</Text>
    </View>
  );
};

// Composant de question avec animations
const RevisionQuestion = ({ 
  question, 
  options, 
  correctAnswerKey, 
  onAnswer,
  onComplete,
  image,
  explanation,
  showHint,
  onShowHint
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIMER_SECONDS);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const scaleAnim = useRef(options.map(() => new Animated.Value(1))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(null);
  const timer = useRef(null);
  const confettiAnimation = useRef(null);
  
  useEffect(() => {
    // Animation d'entrée
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true
    }).start();
    
    // Démarrer la progression temporelle
    startProgressTimer();
    
    return () => {
      // Nettoyage
      if (progressAnimation.current) {
        progressAnimation.current.stop();
      }
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, []);
  
  useEffect(() => {
    // Réinitialiser l'état quand la question change
    setSelectedAnswer(null);
    setIsAnswered(false);
    setTimeRemaining(QUESTION_TIMER_SECONDS);
    setShowExplanation(false);
    resultAnim.setValue(0);
    progressAnim.setValue(1);
    
    options.forEach((_, index) => {
      scaleAnim[index].setValue(1);
    });
    
    // Redémarrer la progression temporelle
    startProgressTimer();
    
    return () => {
      // Nettoyage
      if (progressAnimation.current) {
        progressAnimation.current.stop();
      }
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [question]);

  const startProgressTimer = () => {
    // Animation de la barre de progression
    progressAnimation.current = Animated.timing(progressAnim, {
      toValue: 0,
      duration: QUESTION_TIMER_SECONDS * 1000,
      useNativeDriver: false
    });
    progressAnimation.current.start(({ finished }) => {
      if (finished && !isAnswered) {
        // Temps écoulé, traiter comme une réponse incorrecte
        handleTimeUp();
      }
    });
    
    // Timer pour l'affichage du compte à rebours
    timer.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    if (!isAnswered) {
      setIsAnswered(true);
      // Utiliser null comme réponse pour indiquer que le temps est écoulé
      onAnswer(null);
      
      // Animation du résultat
      Animated.timing(resultAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      }).start();
      
      // Afficher l'explication après un délai
      setTimeout(() => {
        setShowExplanation(true);
      }, 1000);
    }
  };

  const handleAnswer = (key, index) => {
    if (isAnswered) return;
    
    // Arrêter le timer
    if (progressAnimation.current) {
      progressAnimation.current.stop();
    }
    if (timer.current) {
      clearInterval(timer.current);
    }
    
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
    
    // Si la réponse est correcte, jouer l'animation confetti
    if (key === correctAnswerKey && confettiAnimation.current) {
      confettiAnimation.current.play();
    }
    
    // Appeler la fonction de callback avec la réponse
    onAnswer(key);
    
    // Afficher l'explication après un délai
    setTimeout(() => {
      setShowExplanation(true);
    }, 1000);
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

  const handleContinue = () => {
    // Animation de sortie
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      onComplete();
    });
  };

  return (
    <View style={styles.questionContainerWrapper}>
      {/* Barre de progression temporelle */}
      <View style={styles.timerContainer}>
        <Animated.View 
          style={[
            styles.timerBar,
            { 
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }
          ]}
        />
      </View>
      
      <Animated.View style={[
        styles.questionCard,
        { opacity: fadeAnim }
      ]}>
        {/* Animation confetti pour les bonnes réponses */}
        {isAnswered && selectedAnswer === correctAnswerKey && (
          <View style={styles.confettiContainer}>
            {/* Animation à remplacer par une implémentation de confetti personnalisée */}
            <View style={styles.confettiWrapper}>
              {Array.from({ length: 30 }).map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.confettiPiece,
                    { 
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      backgroundColor: ['#FFD700', '#FF6B6B', '#4CAF50', '#2196F3', '#9C27B0'][Math.floor(Math.random() * 5)],
                      transform: [{ rotate: `${Math.random() * 360}deg` }],
                      width: Math.random() * 8 + 4,
                      height: Math.random() * 8 + 4
                    }
                  ]}
                />
              ))}
            </View>
          </View>
        )}
        
        <View style={styles.questionContent}>
          <Text style={styles.questionText}>{question}</Text>
          
          {image && (
            <Image 
              source={{ uri: image }} 
              style={styles.questionImage}
              resizeMode="contain"
            />
          )}
          
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
          
          {!isAnswered && !showHint && (
            <TouchableOpacity style={styles.hintButton} onPress={onShowHint}>
              <Ionicons name="bulb-outline" size={20} color="#1927b6" />
              <Text style={styles.hintButtonText}>Indice</Text>
            </TouchableOpacity>
          )}
          
          {isAnswered && showExplanation && (
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationTitle}>Explication:</Text>
              <Text style={styles.explanationText}>{explanation}</Text>
            </View>
          )}
        </View>
        
        {isAnswered && (
          <View style={styles.resultContainer}>
            <View style={[
              styles.resultBadge,
              selectedAnswer === correctAnswerKey ? styles.correctBadge : styles.incorrectBadge
            ]}>
              <Text style={styles.resultText}>
                {selectedAnswer === correctAnswerKey 
                  ? "Super ! 🎉" 
                  : selectedAnswer === null 
                    ? "Temps écoulé ⏱️" 
                    : "Essaie encore 😊"
                }
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continuer</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

// Composant principal de l'écran de quiz de révision
const RevisionQuizScreen = ({ route, navigation }) => {
  const { themes, incorrectOnly } = route.params;
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [hasEarnedAchievement, setHasEarnedAchievement] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const achievementAnim = useRef(new Animated.Value(0)).current;
  
  useFocusEffect(
    React.useCallback(() => {
      console.log("RevisionQuizScreen a obtenu le focus");
      loadUserStats();
      return () => {};
    }, [])
  );
  
  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        await Promise.all([fetchQuestions(), loadUserStats()]);
      } catch (err) {
        console.error("Erreur dans l'initialisation du quiz :", err);
        setError(err.message);
      } finally {
        setLoading(false);
        
        // Animation d'entrée
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
      }
    };
    
    initializeQuiz();
  }, []);
  
  const fetchQuestions = async () => {
    try {
      // Construire l'URL avec les paramètres de thèmes et questions incorrectes
      const themesParam = themes.join(',');
      const incorrectParam = incorrectOnly ? '1' : '0';
      const url = `http://0.0.0.0:8000/revision_questions?themes=${themesParam}&incorrect_only=${incorrectParam}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
      
      const jsonData = await response.json();
      setQuestions(jsonData);
      
      if (jsonData.length === 0) {
        throw new Error("Aucune question disponible pour ces critères");
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des questions:", err);
      
      // Données de démonstration en cas d'erreur
      setQuestions([
        {
          id: 1,
          question: "Combien font 8 × 7 ?",
          answers: { "a": "54", "b": "56", "c": "58", "d": "62" },
          correct_answer: "b",
          theme_id: 1,
          explanation: "La multiplication 8 × 7 = 56 peut être visualisée comme 8 groupes de 7 ou 7 groupes de 8.",
          image: null
        },
        {
          id: 2,
          question: "Quelle est la planète la plus proche du Soleil ?",
          answers: { "a": "Venus", "b": "Terre", "c": "Mercure", "d": "Mars" },
          correct_answer: "c",
          theme_id: 2,
          explanation: "Mercure est la première planète du système solaire et la plus proche du Soleil.",
          image: "https://placehold.co/600x400/FFDAB9/333?text=Système+solaire"
        },
        {
          id: 3,
          question: "Qui a écrit 'Les Misérables' ?",
          answers: { "a": "Alexandre Dumas", "b": "Victor Hugo", "c": "Émile Zola", "d": "Jules Verne" },
          correct_answer: "b",
          theme_id: 5,
          explanation: "Les Misérables est un roman historique de Victor Hugo publié en 1862.",
          image: null
        }
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
      setUserStats(Array.isArray(parsedStats) ? parsedStats : []);
    } catch (err) {
      console.error("Erreur lors de la lecture des stats", err);
      setUserStats([]);
    }
  };
  
  const saveUserAnswer = async (questionId, userAnswer, correctAnswer) => {
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
        isCorrect: userAnswer === correctAnswer,
        timestamp: new Date().toISOString(),
        themeId: questions[currentQuestionIndex].theme_id
      };
      
      const updatedStats = [...currentStats, newStat];
      
      await FileSystem.writeAsStringAsync(
        USER_STATS_PATH,
        JSON.stringify(updatedStats)
      );
      
      setUserStats(updatedStats);
      
      // Mettre à jour le score si la réponse est correcte
      if (userAnswer === correctAnswer) {
        setScore(prev => prev + 1);
      }
      
      // Vérifier si un nouvel accomplissement est débloqué
      checkForAchievements(updatedStats);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de la réponse:", err);
    }
  };
  
  const checkForAchievements = (stats) => {
    // Vérifier si l'utilisateur a obtenu 5 bonnes réponses consécutives
    const recentStats = stats.slice(-5);
    if (recentStats.length === 5 && recentStats.every(stat => stat.isCorrect)) {
      setHasEarnedAchievement(true);
      
      // Afficher l'animation de l'accomplissement
      Animated.sequence([
        Animated.timing(achievementAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.delay(3000),
        Animated.timing(achievementAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        })
      ]).start();
    }
  };
  
  const handleAnswer = (userAnswer) => {
    const currentQuestion = questions[currentQuestionIndex];
    saveUserAnswer(currentQuestion.id, userAnswer, currentQuestion.correct_answer);
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowHint(false);
    } else {
      // Quiz terminé
      setQuizComplete(true);
    }
  };
  
  const handleShowHint = () => {
    setShowHint(true);
  };
  
  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowHint(false);
    setQuizComplete(false);
  };
  
  const navigateToHome = () => {
    navigation.navigate('Home');
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
          onPress={() => fetchQuestions()}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (quizComplete) {
    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1927b6" />
        <Animated.View style={[styles.completionContainer, { opacity: fadeAnim }]}>
          <View style={styles.scoreCard}>
            <Text style={styles.completionTitle}>Révision terminée !</Text>
            
            {percentage >= 80 ? (
              <View style={[styles.completionAnimation, styles.successAnimation]}>
                <Text style={styles.completionEmoji}>🎉</Text>
                <Ionicons name="trophy" size={60} color="#FFD700" />
              </View>
            ) : percentage >= 50 ? (
              <View style={[styles.completionAnimation, styles.goodJobAnimation]}>
                <Text style={styles.completionEmoji}>👍</Text>
                <Ionicons name="thumbs-up" size={60} color="#2196F3" />
              </View>
            ) : (
              <View style={[styles.completionAnimation, styles.keepTryingAnimation]}>
                <Text style={styles.completionEmoji}>💪</Text>
                <Ionicons name="fitness" size={60} color="#F44336" />
              </View>
            )}
            
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>Ton score</Text>
              <Text style={styles.scoreValue}>{score}/{totalQuestions}</Text>
              <View style={styles.scoreProgressContainer}>
                <View style={[styles.scoreProgressBar, { width: `${percentage}%` }]} />
              </View>
              <Text style={styles.scorePercentage}>{percentage}%</Text>
            </View>
            
            <Text style={styles.completionMessage}>
              {percentage >= 80 
                ? "Excellent travail ! Continue comme ça !" 
                : percentage >= 50 
                ? "Bon travail ! Continue de t'entraîner." 
                : "Continue de t'exercer, tu vas t'améliorer !"}
            </Text>
            
            <View style={styles.completionButtons}>
              <TouchableOpacity 
                style={[styles.completionButton, styles.restartButton]}
                onPress={restartQuiz}
              >
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.completionButtonText}>Recommencer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.completionButton, styles.homeButton]}
                onPress={navigateToHome}
              >
                <Ionicons name="home" size={20} color="#1927b6" />
                <Text style={[styles.completionButtonText, styles.homeButtonText]}>
                  Accueil
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  
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
        <ProgressBar 
          currentQuestion={currentQuestionIndex + 1} 
          totalQuestions={questions.length} 
        />
      </View>
      
      <Animated.View style={[styles.quizContainer, { opacity: fadeAnim }]}>
        <RevisionQuestion
          question={currentQuestion.question}
          options={Object.entries(currentQuestion.answers)}
          correctAnswerKey={currentQuestion.correct_answer}
          onAnswer={handleAnswer}
          onComplete={handleNextQuestion}
          image={currentQuestion.image}
          explanation={currentQuestion.explanation}
          showHint={showHint}
          onShowHint={handleShowHint}
        />
      </Animated.View>
      
      {/* Notification d'accomplissement */}
      <Animated.View 
        style={[
          styles.achievementNotification,
          {
            opacity: achievementAnim,
            transform: [
              { translateY: achievementAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0]
              })}
            ]
          }
        ]}
      >
        <View style={styles.achievementContent}>
          <Ionicons name="trophy" size={24} color="#FFD700" />
          <Text style={styles.achievementText}>
            Nouvel accomplissement débloqué !
          </Text>
        </View>
      </Animated.View>
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
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#1621a0",
    height: HEADER_HEIGHT,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  progressContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    marginRight: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 4,
  },
  progressText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  quizContainer: {
    flex: 1,
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
  questionContainerWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  timerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    zIndex: 5,
  },
  timerBar: {
    height: 4,
    backgroundColor: "#ffffff",
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
    flex: 1,
    paddingVertical: 30,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  questionText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  questionImage: {
    width: "100%",
    height: 150,
    marginBottom: 20,
    borderRadius: 12,
  },
  optionsContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
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
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
  },
  hintButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#1927b6",
    borderRadius: 20,
    marginTop: 10,
  },
  hintButtonText: {
    color: "#1927b6",
    fontWeight: "500",
    fontSize: 14,
    marginLeft: 5,
  },
  explanationContainer: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1927b6",
    marginTop: 20,
    width: "100%",
  },
  explanationTitle: {
    fontWeight: "bold",
    color: "#1927b6",
    marginBottom: 5,
    fontSize: 15,
  },
  explanationText: {
    color: "#555",
    fontSize: 14,
    lineHeight: 20,
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
    marginBottom: 15,
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
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1927b6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  continueButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    marginRight: 8,
  },
  confettiContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    pointerEvents: "none",
  },
  confettiWrapper: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confettiPiece: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scoreCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "100%",
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1927b6",
    marginBottom: 20,
    textAlign: "center",
  },
  completionAnimation: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  successAnimation: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 75,
  },
  goodJobAnimation: {
    backgroundColor: "rgba(33, 150, 243, 0.1)",
    borderRadius: 75,
  },
  keepTryingAnimation: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 75,
  },
  completionEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  scoreContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 15,
  },
  scoreText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1927b6",
    marginBottom: 10,
  },
  scoreProgressContainer: {
    width: "100%",
    height: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    marginBottom: 5,
    overflow: "hidden",
  },
  scoreProgressBar: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 5,
  },
  scorePercentage: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  completionMessage: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginVertical: 15,
    lineHeight: 22,
  },
  completionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  completionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 5,
  },
  restartButton: {
    backgroundColor: "#1927b6",
  },
  homeButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#1927b6",
  },
  completionButtonText: {
    fontWeight: "bold",
    color: "#ffffff",
    marginLeft: 5,
  },
  homeButtonText: {
    color: "#1927b6",
  },
  achievementNotification: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#1621a0",
    zIndex: 100,
  },
  achievementContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  achievementText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  }
});

export default RevisionQuizScreen;
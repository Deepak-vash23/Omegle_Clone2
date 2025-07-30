import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import styles from "../styles/Home.module.css";
import { RtmChannel } from "agora-rtm-sdk";
import {
  ICameraVideoTrack,
  IRemoteVideoTrack,
  IAgoraRTCClient,
  IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";

type TCreateRoomResponse = {
  room: Room;
  rtcToken: string;
  rtmToken: string;
};

type TGetRandomRoomResponse = {
  rtcToken: string;
  rtmToken: string;
  rooms: Room[];
};

type Room = {
  _id: string;
  status: string;
};

type TMessage = {
  userId: string;
  message: string | undefined;
};

// Authentication types
type User = {
  id: string;
  userID: string;
  username: string;
  email: string;
};

type ChallengeUser = {
  id: string;
  username: string;
  video?: IRemoteVideoTrack | ICameraVideoTrack;
  isPerformer?: boolean;
};

function createRoom(userId: string): Promise<TCreateRoomResponse> {
  return fetch(`/api/rooms?userId=${userId}`, {
    method: "POST",
  }).then((response) => response.json());
}

function getRandomRoom(userId: string): Promise<TGetRandomRoomResponse> {
  return fetch(`/api/rooms?userId=${userId}`).then((response) =>
    response.json()
  );
}

function setRoomToWaiting(roomId: string) {
  return fetch(`/api/rooms/${roomId}`, { method: "PUT" }).then((response) =>
    response.json()
  );
}

export const VideoPlayer = ({
  videoTrack,
  style,
}: {
  videoTrack: IRemoteVideoTrack | ICameraVideoTrack;
  style: object;
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const playerRef = ref.current;
    if (!videoTrack) return;
    if (!playerRef) return;

    videoTrack.play(playerRef);

    return () => {
      videoTrack.stop();
    };
  }, [videoTrack]);

  return <div ref={ref} style={style}></div>;
};

async function connectToAgoraRtc(
  roomId: string,
  userId: string,
  onVideoConnect: any,
  onWebcamStart: any,
  onAudioConnect: any,
  token: string
) {
  const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");

  const client = AgoraRTC.createClient({
    mode: "rtc",
    codec: "vp8",
  });

  await client.join(
    process.env.NEXT_PUBLIC_AGORA_APP_ID!,
    roomId,
    token,
    userId
  );

  client.on("user-published", (themUser, mediaType) => {
    client.subscribe(themUser, mediaType).then(() => {
      if (mediaType === "video") {
        onVideoConnect(themUser.videoTrack);
      }
      if (mediaType === "audio") {
        onAudioConnect(themUser.audioTrack);
        themUser.audioTrack?.play();
      }
    });
  });

  const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
  onWebcamStart(tracks[1]);
  await client.publish(tracks);

  return { tracks, client };
}

async function connectToAgoraRtm(
  roomId: string,
  userId: string,
  onMessage: (message: TMessage) => void,
  token: string
) {
  const { default: AgoraRTM } = await import("agora-rtm-sdk");
  const client = AgoraRTM.createInstance(process.env.NEXT_PUBLIC_AGORA_APP_ID!);
  await client.login({
    uid: userId,
    token,
  });
  const channel = await client.createChannel(roomId);
  await channel.join();
  channel.on("ChannelMessage", (message, userId) => {
    onMessage({
      userId,
      message: message.text,
    });
  });

  return {
    channel,
  };
}

// Rules Modal Component
const RulesModal = ({ onAccept, onCancel }: { onAccept: () => void; onCancel: () => void }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#222',
        padding: '3rem',
        borderRadius: '20px',
        maxWidth: '600px',
        width: '90%',
        textAlign: 'center',
        color: 'white',
        border: '2px solid #ff6b6b'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ marginBottom: '2rem', color: '#ff6b6b' }}>Challenge Rules</h2>
        
        <div style={{ textAlign: 'left', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
          <h3 style={{ color: '#ffd93d', marginBottom: '1rem' }}>Important Rules:</h3>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#ff6b6b' }}>1. No Abusive Language</strong>
            <p style={{ color: '#ccc', margin: '0.5rem 0' }}>Any use of offensive, inappropriate, or abusive language will result in immediate reporting and potential ban.</p>
          </div>
          <div>
            <strong style={{ color: '#ff6b6b' }}>2. No Abusive Dares</strong>
            <p style={{ color: '#ccc', margin: '0.5rem 0' }}>Dares must be fun, safe, and appropriate. No harmful, dangerous, or inappropriate challenges allowed.</p>
          </div>
        </div>

        <div style={{ background: 'rgba(255,215,0,0.1)', padding: '1rem', borderRadius: '10px', marginBottom: '2rem' }}>
          <p style={{ color: '#ffd93d', fontWeight: 'bold' }}>
            🎯 How it works: 3 random users join, one is selected to perform a dare, the other 2 give the dare and award points!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: '2px solid #ccc',
              color: '#ccc',
              padding: '1rem 2rem',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onAccept}
            style={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              border: 'none',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '25px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
};

// Updated DareGameInterface with proper camera access
const DareGameInterface = ({ currentUser, onBack }: any) => {
  const [gamePhase, setGamePhase] = useState<'waiting' | 'selecting' | 'dare_input' | 'performing' | 'voting' | 'results'>('waiting');
  const [connectedUsers, setConnectedUsers] = useState<ChallengeUser[]>([]);
  const [selectedPerformer, setSelectedPerformer] = useState<ChallengeUser | null>(null);
  const [currentDare, setCurrentDare] = useState('');
  const [dareInputs, setDareInputs] = useState<{[userId: string]: string}>({});
  const [votes, setVotes] = useState<{[userId: string]: number}>({});
  const [timeLeft, setTimeLeft] = useState(30);
  
  // Video states for 3 users
  const [user1Video, setUser1Video] = useState<IRemoteVideoTrack | ICameraVideoTrack>();
  const [user2Video, setUser2Video] = useState<IRemoteVideoTrack | ICameraVideoTrack>();
  const [user3Video, setUser3Video] = useState<IRemoteVideoTrack | ICameraVideoTrack>();
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [input, setInput] = useState("");
  
  // Video connection refs
  const channelRef = useRef<RtmChannel>();
  const rtcClientRef = useRef<IAgoraRTCClient>();

  // Initialize camera access when component mounts
  useEffect(() => {
    const initializeCameras = async () => {
      try {
        // Get user's own camera first
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        setUser1Video(tracks[1]); // Set user's own video
        
        // Simulate connecting to Agora room for 3-user challenge
        // In real implementation, you'd connect to a specific challenge room
        const mockConnectToRoom = async () => {
          setTimeout(() => {
            const mockUsers: ChallengeUser[] = [
              { id: currentUser?.userID || '1', username: currentUser?.username || 'You', video: tracks[1] },
              { id: '2', username: 'Player2', video: undefined }, // Will be set when they join
              { id: '3', username: 'Player3', video: undefined }  // Will be set when they join
            ];
            setConnectedUsers(mockUsers);
            
            // Simulate other users joining with their cameras
            setTimeout(() => {
              // In real implementation, these would be actual remote video tracks
              // For now, we'll use placeholders to show the UI structure
              setGamePhase('selecting');
            }, 2000);
          }, 1000);
        };

        mockConnectToRoom();
      } catch (error) {
        console.error('Failed to access camera:', error);
        alert('Camera access denied. Please allow camera access and refresh the page.');
      }
    };

    initializeCameras();

    // Cleanup function
    return () => {
      if (user1Video) {
        user1Video.stop();
      }
      if (channelRef.current) {
        channelRef.current.leave();
      }
      if (rtcClientRef.current) {
        rtcClientRef.current.leave();
      }
    };
  }, []);

  // Auto-select random performer
  useEffect(() => {
    if (gamePhase === 'selecting' && connectedUsers.length === 3) {
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * 3);
        const performer = { ...connectedUsers[randomIndex], isPerformer: true };
        setSelectedPerformer(performer);
        setGamePhase('dare_input');
      }, 2000);
    }
  }, [gamePhase, connectedUsers, currentUser?.userID, currentUser?.username, user1Video]);

  const handleDareSubmit = () => {
    if (selectedPerformer?.id !== currentUser?.userID) {
      const dareText = dareInputs[currentUser?.userID || ''] || '';
      if (dareText.trim()) {
        setCurrentDare(dareText);
        setGamePhase('performing');
        setTimeLeft(60);
      }
    }
  };

  const handleVote = (points: number) => {
    setVotes(prev => ({ ...prev, [currentUser?.userID || '']: points }));
    setGamePhase('results');
  };

  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages((cur) => [
      ...cur,
      {
        userId: currentUser?.userID || '',
        message: input,
      },
    ]);
    setInput("");
  };

  const convertToUsername = (message: TMessage) => {
    if (message.userId === currentUser?.userID) return "You";
    const user = connectedUsers.find(u => u.id === message.userId);
    return user?.username || "Unknown";
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto', height: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <button 
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '2px solid white',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>🎭 Dare Challenge</h2>
        <div style={{ marginLeft: 'auto', color: '#ffd93d' }}>
          Phase: {gamePhase.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {/* Main Layout: Videos + Chat */}
      <div style={{ 
        display: 'flex', 
        height: 'calc(100vh - 150px)', 
        gap: '20px' 
      }}>
        
        {/* Video Section - 3 Users Side by Side */}
        <div style={{
          flex: '1',
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* User 1 Video (Your Camera) */}
          <div style={{
            flex: '1',
            maxWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              backgroundColor: '#333',
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: '12px',
              position: 'relative',
              border: selectedPerformer?.id === connectedUsers[0]?.id ? '3px solid #ffd93d' : '2px solid #555',
              marginBottom: '10px'
            }}>
              {user1Video ? (
                <VideoPlayer
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: '12px',
                    objectFit: 'cover' 
                  }}
                  videoTrack={user1Video}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#ccc',
                  fontSize: '1rem',
                  flexDirection: 'column'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                  Starting camera...
                </div>
              )}
              {selectedPerformer?.id === connectedUsers[0]?.id && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: '#ffd93d',
                  color: '#000',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  PERFORMER
                </div>
              )}
            </div>
            <div style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
              {connectedUsers[0]?.username || 'You'}
            </div>
          </div>

          {/* User 2 Video */}
          <div style={{
            flex: '1',
            maxWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              backgroundColor: '#333',
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: '12px',
              position: 'relative',
              border: selectedPerformer?.id === connectedUsers[1]?.id ? '3px solid #ffd93d' : '2px solid #555',
              marginBottom: '10px'
            }}>
              {user2Video ? (
                <VideoPlayer
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: '12px',
                    objectFit: 'cover' 
                  }}
                  videoTrack={user2Video}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#ccc',
                  fontSize: '1rem',
                  flexDirection: 'column'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
                  {gamePhase === 'waiting' ? 'Waiting for user...' : 'Camera connecting...'}
                </div>
              )}
              {selectedPerformer?.id === connectedUsers[1]?.id && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: '#ffd93d',
                  color: '#000',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  PERFORMER
                </div>
              )}
            </div>
            <div style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
              {connectedUsers[1]?.username || 'Player 2'}
            </div>
          </div>

          {/* User 3 Video */}
          <div style={{
            flex: '1',
            maxWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              backgroundColor: '#333',
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: '12px',
              position: 'relative',
              border: selectedPerformer?.id === connectedUsers[2]?.id ? '3px solid #ffd93d' : '2px solid #555',
              marginBottom: '10px'
            }}>
              {user3Video ? (
                <VideoPlayer
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: '12px',
                    objectFit: 'cover' 
                  }}
                  videoTrack={user3Video}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#ccc',
                  fontSize: '1rem',
                  flexDirection: 'column'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
                  {gamePhase === 'waiting' ? 'Waiting for user...' : 'Camera connecting...'}
                </div>
              )}
              {selectedPerformer?.id === connectedUsers[2]?.id && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: '#ffd93d',
                  color: '#000',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  PERFORMER
                </div>
              )}
            </div>
            <div style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
              {connectedUsers[2]?.username || 'Player 3'}
            </div>
          </div>
        </div>

        {/* Right Side Panel - Game Status + Chat */}
        <div style={{
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          
          {/* Game Status Panel */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '15px',
            minHeight: '200px'
          }}>
            {gamePhase === 'waiting' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <h3>Connecting Camera...</h3>
                <p style={{ color: '#ccc', fontSize: '0.9rem' }}>
                  Setting up your video feed
                </p>
              </div>
            )}

            {gamePhase === 'selecting' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎲</div>
                <h3>Selecting Performer...</h3>
              </div>
            )}

            {gamePhase === 'dare_input' && selectedPerformer && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>🎯 Give a Dare</h3>
                <div style={{ 
                  background: 'rgba(255,215,0,0.2)', 
                  padding: '10px', 
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <strong>{selectedPerformer.username}</strong> will perform!
                </div>
                
                {selectedPerformer.id !== currentUser?.userID ? (
                  <>
                    <textarea
                      value={dareInputs[currentUser?.userID || ''] || ''}
                      onChange={(e) => setDareInputs(prev => ({ ...prev, [currentUser?.userID || '']: e.target.value }))}
                      placeholder="Enter a fun, safe dare..."
                      style={{
                        width: '100%',
                        height: '80px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid #fa709a',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        fontSize: '0.9rem',
                        resize: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      onClick={handleDareSubmit}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginTop: '8px',
                        fontSize: '0.9rem'
                      }}
                    >
                      Submit Dare
                    </button>
                  </>
                ) : (
                  <div style={{ color: '#ffd93d', textAlign: 'center', fontSize: '0.9rem' }}>
                    You&apos;re the performer! Wait for your dare...
                  </div>
                )}
              </div>
            )}

            {gamePhase === 'performing' && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>🎬 Performance Time!</h3>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '10px', 
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#ffd93d', marginBottom: '5px' }}>The Dare:</div>
                  <div style={{ fontSize: '0.9rem' }}>"{currentDare}&quot</div>
                </div>
                
                <div style={{ textAlign: 'center', color: '#fa709a', fontSize: '1.5rem' }}>
                  ⏱️ {timeLeft}s
                </div>

                {selectedPerformer?.id !== currentUser?.userID && (
                  <button
                    onClick={() => setGamePhase('voting')}
                    style={{
                      width: '100%',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginTop: '10px',
                      fontSize: '0.9rem'
                    }}
                  >
                    Done - Vote Now
                  </button>
                )}
              </div>
            )}

            {gamePhase === 'voting' && selectedPerformer?.id !== currentUser?.userID && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>⭐ Rate Performance</h3>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '1rem' }}>
                  {[1, 2, 3, 4, 5].map(points => (
                    <button
                      key={points}
                      onClick={() => handleVote(points)}
                      style={{
                        flex: '1',
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 4px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      {points}⭐
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gamePhase === 'results' && (
              <div style={{ textAlign: 'center' }}>
                <h3>🏆 Results</h3>
                <div style={{ color: '#ffd93d', fontSize: '1.5rem', marginBottom: '1rem' }}>
                  {Object.values(votes).reduce((a, b) => a + b, 0)} points!
                </div>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    width: '100%',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Play Again
                </button>
              </div>
            )}
          </div>

          {/* Small Chat Box */}
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            height: '180px'
          }}>
            <div style={{
              flex: '1',
              padding: '10px',
              overflowY: 'auto',
              color: 'black',
              fontSize: '0.85rem'
            }}>
              {messages.map((message, idx) => (
                <div key={idx} style={{ 
                  marginBottom: '5px',
                  padding: '3px 6px',
                  borderRadius: '5px',
                  backgroundColor: message.userId === currentUser?.userID ? '#e3f2fd' : '#f5f5f5'
                }}>
                  <strong>{convertToUsername(message)}:</strong> {message.message}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmitMessage} style={{
              padding: '10px',
              borderTop: '1px solid #ddd',
              display: 'flex',
              gap: '5px'
            }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Quick message..."
                style={{
                  flex: '1',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  color: 'black',
                  fontSize: '0.85rem'
                }}
              />
              <button type="submit" style={{
                padding: '6px 10px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

;

// Updated Challenges Interface Component
const ChallengesInterface = ({ currentUser, onBackToModeSelection }: any) => {
  const [challengeMode, setChallengeMode] = useState<'menu' | 'versus' | 'active'>('menu');
  const [showRules, setShowRules] = useState(false);
  const [userStats] = useState({
    score: 0,
    challengesCompleted: 0,
    rank: 'Beginner'
  });

  const handleVersusStart = () => {
    setShowRules(true);
  };

  const handleRulesAccept = () => {
    setShowRules(false);
    setChallengeMode('versus');
  };

  const handleRulesCancel = () => {
    setShowRules(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {showRules && (
        <RulesModal onAccept={handleRulesAccept} onCancel={handleRulesCancel} />
      )}

      {challengeMode === 'menu' ? (
        <>
          {/* Challenges Main Menu */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆 Dare Challenges</h1>
            <p style={{ fontSize: '1.2rem', color: '#ccc' }}>
              Connect with others and take on fun dares!
            </p>
          </div>

          {/* User Stats */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1.5rem',
            borderRadius: '15px',
            marginBottom: '3rem',
            textAlign: 'center'
          }}>
            <h3>Your Stats</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{userStats.score}</div>
                <div style={{ color: '#ccc' }}>Points</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{userStats.challengesCompleted}</div>
                <div style={{ color: '#ccc' }}>Dares Completed</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{userStats.rank}</div>
                <div style={{ color: '#ccc' }}>Rank</div>
              </div>
            </div>
          </div>

          {/* Challenge Mode - Only Versus */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '2rem'
          }}>
            <div 
              onClick={handleVersusStart}
              style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                padding: '3rem 2rem',
                borderRadius: '20px',
                cursor: 'pointer',
                width: '400px',
                textAlign: 'center',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                boxShadow: '0 15px 35px rgba(0,0,0,0.4)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.boxShadow = '0 20px 45px rgba(0,0,0,0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.4)';
              }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎭</div>
              <h2 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Dare Challenge</h2>
              <p style={{ color: '#ddd', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                Join 2 other players for fun dare challenges
              </p>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '10px' }}>
                <p style={{ color: '#fff', fontWeight: 'bold', margin: 0 }}>
                  🎯 3 Players • Random Selection • Fun Dares • Earn Points
                </p>
              </div>
            </div>
          </div>

          {/* How it Works Section */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '2rem',
            borderRadius: '15px',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#ffd93d', marginBottom: '1.5rem' }}>How It Works</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                <h4>1. Connect</h4>
                <p style={{ color: '#ccc', fontSize: '0.9rem' }}>3 random users join the challenge room</p>
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎲</div>
                <h4>2. Random Pick</h4>
                <p style={{ color: '#ccc', fontSize: '0.9rem' }}>One user is randomly selected to perform</p>
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
                <h4>3. Dare & Perform</h4>
                <p style={{ color: '#ccc', fontSize: '0.9rem' }}>Others give a dare, performer completes it</p>
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭐</div>
                <h4>4. Vote & Earn</h4>
                <p style={{ color: '#ccc', fontSize: '0.9rem' }}>Rate performance and earn points</p>
              </div>
            </div>
          </div>
        </>
      ) : challengeMode === 'versus' ? (
        <DareGameInterface 
          currentUser={currentUser}
          onBack={() => setChallengeMode('menu')}
        />
      ) : null}
    </div>
  );
};

export default function Home() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true);

  // New mode selection states
  const [selectedMode, setSelectedMode] = useState<'omegle' | 'challenges' | null>(null);

  // Chat states
  const [room, setRoom] = useState<Room | undefined>();
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [input, setInput] = useState("");
  const [themVideo, setThemVideo] = useState<IRemoteVideoTrack>();
  const [myVideo, setMyVideo] = useState<ICameraVideoTrack>();
  const [themAudio, setThemAudio] = useState<IRemoteAudioTrack>();
  const channelRef = useRef<RtmChannel>();
  const rtcClientRef = useRef<IAgoraRTCClient>();

  // Use authenticated user's ID or fallback to random ID
  const userId = currentUser?.userID || `temp_${Math.floor(Math.random() * 1000000)}`;

  // Mode selection handlers
  const handleModeSelect = (mode: 'omegle' | 'challenges') => {
    setSelectedMode(mode);
  };

  const handleBackToModeSelection = () => {
    setSelectedMode(null);
    handleStopChat();
  };

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('authToken');
        }
      } catch (error) {
        localStorage.removeItem('authToken');
      }
    }
    setLoading(false);
  };

  const handleAuth = async (email: string, password: string, username?: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          email,
          password,
          username
        })
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setShowAuth(false);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      alert('Authentication failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setSelectedMode(null);
    handleStopChat();
  };

  function handleNextClick() {
    connectToARoom();
  }

  function handleStartChattingClicked() {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    connectToARoom();
  }

  async function handleSubmitMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    
    await channelRef.current?.sendMessage({
      text: input,
    });
    setMessages((cur) => [
      ...cur,
      {
        userId,
        message: input,
      },
    ]);
    setInput("");
  }

  async function connectToARoom() {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }

    setThemAudio(undefined);
    setThemVideo(undefined);
    setMyVideo(undefined);
    setMessages([]);

    if (channelRef.current) {
      await channelRef.current.leave();
    }

    if (rtcClientRef.current) {
      rtcClientRef.current.leave();
    }

    const { rooms, rtcToken, rtmToken } = await getRandomRoom(userId);

    if (room) {
      setRoomToWaiting(room._id);
    }

    if (rooms && rooms.length > 0) {
      setRoom(rooms[0]);
      const { channel } = await connectToAgoraRtm(
        rooms[0]._id,
        userId,
        (message: TMessage) => setMessages((cur) => [...cur, message]),
        rtmToken
      );
      channelRef.current = channel;

      const { tracks, client } = await connectToAgoraRtc(
        rooms[0]._id,
        userId,
        (themVideo: IRemoteVideoTrack) => setThemVideo(themVideo),
        (myVideo: ICameraVideoTrack) => setMyVideo(myVideo),
        (themAudio: IRemoteAudioTrack) => setThemAudio(themAudio),
        rtcToken
      );
      rtcClientRef.current = client;
    } else {
      const { room, rtcToken, rtmToken } = await createRoom(userId);
      setRoom(room);
      const { channel } = await connectToAgoraRtm(
        room._id,
        userId,
        (message: TMessage) => setMessages((cur) => [...cur, message]),
        rtmToken
      );
      channelRef.current = channel;

      const { tracks, client } = await connectToAgoraRtc(
        room._id,
        userId,
        (themVideo: IRemoteVideoTrack) => setThemVideo(themVideo),
        (myVideo: ICameraVideoTrack) => setMyVideo(myVideo),
        (themAudio: IRemoteAudioTrack) => setThemAudio(themAudio),
        rtcToken
      );
      rtcClientRef.current = client;
    }
  }

  function convertToYouThem(message: TMessage) {
    return message.userId === userId ? "You" : "Them";
  }

  const isChatting = room!!;

  const handleStopChat = async () => {
    if (channelRef.current) {
      try {
        await channelRef.current.leave();
        console.log('RTM channel left');
      } catch (error) {
        console.error('Error leaving RTM channel:', error);
      }
      channelRef.current = undefined;
    }

    if (rtcClientRef.current) {
      try {
        await rtcClientRef.current.leave();
        console.log('RTC client left');
      } catch (error) {
        console.error('Error leaving RTC client:', error);
      }
      rtcClientRef.current = undefined;
    }

    setThemAudio(undefined);
    setThemVideo(undefined);
    setMyVideo(undefined);
    setMessages([]);
    setRoom(undefined);
    
    console.log('Chat stopped and connections cleaned up');
  };

  return (
    <>
      <Head>
        <title>Engagee - Engage & Challenge</title>
        <meta name="description" content="Video chat with strangers or take on challenges" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{
        minHeight: '100vh',
        background: selectedMode ? '#000' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            fontSize: '1.2rem'
          }}>
            Loading...
          </div>
        )}

        {/* Authentication Modal */}
        {showAuth && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '10px',
              width: '90%',
              maxWidth: '400px',
              color: 'black'
            }}>
              <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                {authMode === 'login' ? 'Login' : 'Register'}
              </h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const email = formData.get('email') as string;
                const password = formData.get('password') as string;
                const username = formData.get('username') as string;
                handleAuth(email, password, username);
              }}>
                {authMode === 'register' && (
                  <input
                    name="username"
                    type="text"
                    placeholder="Username"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      marginBottom: '1rem',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    boxSizing: 'border-box'
                  }}
                />
                <button type="submit" style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginBottom: '1rem'
                }}>
                  {authMode === 'login' ? 'Login' : 'Register'}
                </button>
              </form>
              
              <p style={{ textAlign: 'center' }}>
                {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  style={{
                    background: 'none',
                    color: '#007bff',
                    textDecoration: 'underline',
                    border: 'none',
                    cursor: 'pointer',
                    marginLeft: '0.5rem'
                  }}
                >
                  {authMode === 'login' ? 'Register' : 'Login'}
                </button>
              </p>
              
              <button 
                onClick={() => setShowAuth(false)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {!isAuthenticated ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <h1>Welcome to Engagee</h1>
                <p style={{ marginBottom: '2rem' }}>Connect with strangers or take on challenges</p>
                <button 
                  onClick={() => setShowAuth(true)}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Get Started
                </button>
              </div>
            ) : (
              <>
                {/* Top Right Controls */}
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 100 }}>
                  {selectedMode && (
                    <button 
                      onClick={handleBackToModeSelection}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid white',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginRight: '10px'
                      }}
                    >
                      ← Back
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    Logout
                  </button>
                </div>

                {/* Mode Selection Screen */}
                {!selectedMode ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    textAlign: 'center'
                  }}>
                    <h1 style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>
                      Choose Your Experience
                    </h1>
                    <p style={{ marginBottom: '3rem', fontSize: '1.2rem', color: '#ccc' }}>
                      What would you like to do today?
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      gap: '3rem',
                      flexWrap: 'wrap',
                      justifyContent: 'center'
                    }}>
                      {/* Omegle Mode */}
                      <div 
                        onClick={() => handleModeSelect('omegle')}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          padding: '3rem 2rem',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          width: '300px',
                          textAlign: 'center',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                        }}
                      >
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎥</div>
                        <h2 style={{ marginBottom: '1rem' }}>Random Chat</h2>
                        <p style={{ color: '#ddd' }}>
                          Connect with random strangers from around the world for video chats
                        </p>
                      </div>

                      {/* Challenges Mode */}
                      <div 
                        onClick={() => handleModeSelect('challenges')}
                        style={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          padding: '3rem 2rem',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          width: '300px',
                          textAlign: 'center',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                        }}
                      >
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎭</div>
                        <h2 style={{ marginBottom: '1rem' }}>Dare Challenges</h2>
                        <p style={{ color: '#ddd' }}>
                          Join 2-player dare challenges and earn points for fun performances
                        </p>
                      </div>
                    </div>
                  </div>
                ) : selectedMode === 'omegle' ? (
                  // Omegle Interface with LARGER SQUARE VIDEOS SIDE BY SIDE
                  <>
                    {isChatting ? (
                      <>
                        {/* Control buttons */}
                        <div style={{ 
                          marginBottom: '1rem', 
                          display: 'flex', 
                          gap: '1rem', 
                          justifyContent: 'center', 
                          paddingTop: '60px' 
                        }}>
                          <button onClick={handleNextClick}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#28a745',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer'
                            }}>
                            Next
                          </button>
                          <button onClick={handleStopChat}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#dc3545',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer'
                            }}>
                            Stop
                          </button>
                        </div>

                        {/* NEW LARGER VIDEO LAYOUT */}
                        <div style={{ 
                          display: 'flex', 
                          height: 'calc(100vh - 140px)', 
                          padding: '0 20px', 
                          gap: '20px' 
                        }}>
                          
                          {/* VIDEO AREA: Two large square videos side-by-side */}
                          <div style={{
                            flex: 1,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '20px',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            {/* Other User's Video - Large Square */}
                            <div style={{
                              backgroundColor: '#333',
                              flex: '0 0 45%',          // Each video takes ~45% of available width
                              aspectRatio: '1 / 1',     // Makes it a perfect square
                              borderRadius: '12px',
                              position: 'relative',
                              minWidth: '350px',        // Larger minimum size
                              maxWidth: '550px',        // Larger maximum size
                              border: '2px solid #555'
                            }}>
                              {themVideo ? (
                                <VideoPlayer
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    borderRadius: '12px', 
                                    objectFit: 'cover' 
                                  }}
                                  videoTrack={themVideo}
                                />
                              ) : (
                                <div style={{ 
                                  color: '#ccc', 
                                  display: 'flex', 
                                  justifyContent: 'center', 
                                  alignItems: 'center', 
                                  height: '100%',
                                  fontSize: '1.2rem'
                                }}>
                                  Waiting for other user...
                                </div>
                              )}
                            </div>

                            {/* Your Video - Large Square */}
                            <div style={{
                              backgroundColor: '#333',
                              flex: '0 0 45%',
                              aspectRatio: '1 / 1',
                              borderRadius: '12px',
                              position: 'relative',
                              minWidth: '350px',
                              maxWidth: '550px',
                              border: '2px solid #555'
                            }}>
                              {myVideo ? (
                                <VideoPlayer
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    borderRadius: '12px', 
                                    objectFit: 'cover' 
                                  }}
                                  videoTrack={myVideo}
                                />
                              ) : (
                                <div style={{ 
                                  color: '#ccc', 
                                  display: 'flex', 
                                  justifyContent: 'center', 
                                  alignItems: 'center', 
                                  height: '100%',
                                  fontSize: '1rem'
                                }}>
                                  Your camera is starting...
                                </div>
                              )}
                            </div>
                          </div>

                          {/* CHAT PANEL - Unchanged size */}
                          <div style={{
                            width: '350px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column'
                          }}>
                            <div style={{ 
                              flex: 1, 
                              padding: '20px', 
                              overflowY: 'auto', 
                              color: '#000' 
                            }}>
                              {messages.map((message, idx) => (
                                <div key={idx} style={{ marginBottom: '10px' }}>
                                  <strong>{convertToYouThem(message)}:</strong> {message.message}
                                </div>
                              ))}
                            </div>

                            <form onSubmit={handleSubmitMessage} style={{ 
                              padding: '20px', 
                              borderTop: '1px solid #ddd', 
                              display: 'flex', 
                              gap: '10px' 
                            }}>
                              <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type a message..."
                                style={{ 
                                  flex: 1, 
                                  padding: '8px', 
                                  border: '1px solid #ddd', 
                                  borderRadius: '4px', 
                                  color: '#000' 
                                }}
                              />
                              <button type="submit" style={{ 
                                padding: '8px 16px', 
                                background: '#007bff', 
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: '4px', 
                                cursor: 'pointer' 
                              }}>
                                Send
                              </button>
                            </form>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        textAlign: 'center'
                      }}>
                        <h2 style={{ marginBottom: '2rem' }}>Ready to meet a stranger?</h2>
                        <button 
                          onClick={handleStartChattingClicked}
                          style={{
                            padding: '1rem 2rem',
                            fontSize: '1.1rem',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          Start Chatting
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  // Challenges Interface
                  <ChallengesInterface 
                    currentUser={currentUser}
                    onBackToModeSelection={handleBackToModeSelection}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}

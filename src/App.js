import React, { useState, useEffect,useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRedo, faStepBackward, faPlay,faSearch , faStepForward, faRandom, faPlus, faPause} from '@fortawesome/free-solid-svg-icons';
import './styles.css';

// Client ID, Client Secret, Redirect URI
const clientId = 'adf9590152f44c25bb5b107d7b0c0a64';
const clientSecret = 'e92f19835c5f4c8c91c2445eb28b77e1';
const redirectUri = 'http://localhost:3000'; 

// Lưu trữ token
let token = 'BQBDMeiCejoZR6vOmspif7JwnzyjzSkXuvEydfNQllZzFTxD2Wwz1QTm9twWhw1SxCLqL2B3orIt9OmL0hVGHgRiFX3soT9KR7oKTU-nDk_bas32s-idVsPIsUFBSiKWe5eivVQXE2ehPp6iQZLhHjCVR9ZE_1onOPAxUc065N9xuchbtHd8FNi53vhpJEDJEDFRJeSOPhEubdxXUVWn2ZUQcOY'; // Access Token
let refreshToken = 'AQCCQsnJfRgnCK6h_4g4m9do6WSZmimDCE_va80PgMCp_SF93oEjIhT1iCSejPazhN-g29-aqUBwzaoXaiMSLT53d8GpuP-0112R_fhmNK03875N6Xi6kNQ6wrF5dsE8yZc'; // Refresh Token

// Hàm làm mới Access Token khi token hết hạn
async function refreshAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(clientId + ':' + clientSecret)}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  const data = await response.json();
  if (data.access_token) {
    token = data.access_token; // Cập nhật token mới
    console.log('New Access Token:', token);
    return token;
  } else {
    throw new Error('Failed to refresh access token');
  }
}

// Hàm gọi API Spotify
async function fetchWebApi(endpoint, method, body) {
  try {
    let res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`, // Sử dụng token hiện tại
      },
      method,
      body: JSON.stringify(body),
    });

    if (res.status === 401) { // Nếu gặp lỗi 401 (Token hết hạn)
      console.log('Access token expired, refreshing...');
      token = await refreshAccessToken(); // Lấy Access Token mới
      return fetchWebApi(endpoint, method, body); // Gọi lại API với token mới
    }

    if (!res.ok) {
      const errorData = await res.json();
      console.error('API Error:', errorData);
      throw new Error(`API Error: ${errorData.error.message}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Fetch Error:', error);
    return null; // Trả về null nếu có lỗi
  }
}

// Tìm kiếm bài hát từ query
async function searchTracks(query) {
  const response = await fetchWebApi(
    `v1/search?q=${query}&type=track&limit=10`,
    'GET'
  );
  console.log('API Response:', response); // In toàn bộ dữ liệu trả về
  return response?.tracks?.items || [];
}

const App = () => {
  
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [audio, setAudio] = useState(null);
  const [trackImage, setTrackImage] = useState(null); 
  const [playingTrack, setPlayingTrack] = useState(null);
  const [repeatMode, setRepeatMode] = useState(0);  // Khai báo repeatMode và setRepeatMode
  const [isRandom, setIsRandom] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // Thời gian hiện tại của bài hát
  const [duration, setDuration] = useState(0); // Tổng thời gian của bài hát
  const [isPlaying, setIsPlaying] = useState(false); // Trạng thái phát nhạc
 

  // Hàm để lấy Access Token và Refresh Token từ code
  const getTokens = async (code) => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret), // Mã hóa base64 clientId và clientSecret
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code, // Mã code bạn nhận được
          redirect_uri: redirectUri, // Redirect URI của bạn
        }),
      });
      const data = await response.json();
      console.log('Response from Spotify:', data); // In phản hồi từ Spotify

      if (data.access_token) {
        token = data.access_token; // Cập nhật token
        refreshToken = data.refresh_token; // Cập nhật refresh token
        console.log('Access Token:', data.access_token);
        console.log('Refresh Token:', data.refresh_token);
      } else {
        console.error('Error:', data);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Hàm để lấy mã code từ URL
  const getCodeFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    return code;
  };

  // Tự động chuyển hướng người dùng đến trang đăng nhập Spotify
  useEffect(() => {
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=user-library-read&redirect_uri=${redirectUri}`;
    const code = getCodeFromUrl(); // Lấy mã code từ URL

    if (!code) {
      // Nếu không có mã code trong URL, tự động chuyển hướng người dùng đến Spotify Authorization
      window.location.href = authUrl;
    } else {
      // Nếu có mã code, gọi hàm để lấy tokens
      getTokens(code);
    }
  }, []);  // Chạy khi component được render

  // Tìm kiếm bài hát mặc định khi mở ứng dụng
  useEffect(() => {
    const fetchDefaultTracks = async () => {
      const results = await searchTracks('perfect'); // Ví dụ tìm kiếm theo từ khóa 
      setSearchResults(results);
    };
    fetchDefaultTracks();
  }, []); // Chạy một lần khi component được render
  //slide tiến độ

  useEffect(() => {
    if (audio) {
      // Cập nhật tổng thời gian khi bài hát được tải
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };
  
      // Cập nhật thời gian hiện tại khi bài hát phát
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
  
      // Xử lý khi bài hát kết thúc
      audio.onended = () => {
        if (repeatMode === 1) {
          // Repeat One: Không reset playingTrack
          const currentTrack = searchResults.find(track => track.id === playingTrack);
          if (currentTrack) {
            handlePlayPause(currentTrack);  // Phát lại bài hát mà không làm mất màu hiển thị
          }
        } else if (repeatMode === 2) {
          // Repeat All: Chuyển sang bài hát tiếp theo
          handleNextTrack();
        } else {
          // Khi tắt chế độ repeat (repeatMode === 0)
          if (searchResults && searchResults.length > 0) {
            // Tìm bài hát tiếp theo trong danh sách
            const nextTrackIndex = searchResults.findIndex(track => track.id === playingTrack) + 1;
            if (nextTrackIndex < searchResults.length) {
              const nextTrack = searchResults[nextTrackIndex];
              handlePlayPause(nextTrack);  // Phát bài hát tiếp theo
            } else {
              // Nếu đã là bài hát cuối, dừng lại
              setIsPlaying(false);
              setPlayingTrack(null);
              setCurrentTime(0);
              setDuration(0);
            }
          }
        }
      };
  
      // Dọn dẹp sự kiện khi audio thay đổi hoặc component bị hủy
      return () => {
        audio.onloadedmetadata = null;
        audio.ontimeupdate = null;
        audio.onended = null;
      };
    }
  }, [audio, playingTrack, repeatMode, searchResults]);
  
  
  // Search for tracks based on query
  const handleSearch = async (e) => {
    e.preventDefault();
    const results = await searchTracks(query);
    setSearchResults(results);
  };
  // nút quay lại
  const handlePrevTrack = () => {
    const currentIndex = searchResults.findIndex(track => track.id === playingTrack);
  
    if (isRandom) {
      // Phát bài hát ngẫu nhiên
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * searchResults.length);
      } while (!searchResults[randomIndex].preview_url); // Đảm bảo bài ngẫu nhiên có preview_url
      handlePlayPause(searchResults[randomIndex]);
    } else if (currentIndex > 0) {
      // Tìm bài trước đó có preview_url
      let prevIndex = currentIndex - 1;
      while (prevIndex >= 0 && !searchResults[prevIndex].preview_url) {
        prevIndex--;
      }
  
      if (prevIndex >= 0) {
        handlePlayPause(searchResults[prevIndex]);
      } else if (repeatMode === 2) {
        // Repeat All: Quay lại bài cuối cùng có preview_url
        let lastTrackWithPreview = null;
        for (let i = searchResults.length - 1; i >= 0; i--) {
          if (searchResults[i].preview_url) {
            lastTrackWithPreview = searchResults[i];
            break;
          }
        }
        if (lastTrackWithPreview) {
          handlePlayPause(lastTrackWithPreview);
        }
      }
    } else if (repeatMode === 2) {
      // Repeat All: Quay lại bài cuối cùng trong danh sách có preview_url
      let lastTrackWithPreview = null;
      for (let i = searchResults.length - 1; i >= 0; i--) {
        if (searchResults[i].preview_url) {
          lastTrackWithPreview = searchResults[i];
          break;
        }
      }
      if (lastTrackWithPreview) {
        handlePlayPause(lastTrackWithPreview);
      }
    }
  };
  
  
  // Play or pause the track
  const handlePlayPause = (track) => {
    if (!track || !track.preview_url) {
      console.error("No preview URL available for this track");
      return;
    }
  
    if (audio) {
      if (playingTrack === track.id) {
        if (audio.paused) {
          // Tiếp tục phát từ vị trí dừng
          audio.play();
          setIsPlaying(true);
        } else {
          // Tạm dừng bài hát
          audio.pause();
          setIsPlaying(false);
        }
      } else {
        // Nếu chuyển bài hát, dừng bài cũ và phát bài mới
        audio.pause();
        const newAudio = new Audio(track.preview_url);
        setAudio(newAudio);
        newAudio.play();
        setPlayingTrack(track.id);
        setIsPlaying(true);
  
        // Cập nhật hình ảnh album
        if (track.album && track.album.images && track.album.images.length > 0) {
          setTrackImage(track.album.images[0].url);
        }
  
        // Xử lý khi bài hát kết thúc
        newAudio.onended = () => {
          setPlayingTrack(null);
          setIsPlaying(false);
          handleNextTrack();
        };
      }
    } else {
      // Trường hợp audio chưa được khởi tạo
      const newAudio = new Audio(track.preview_url);
      setAudio(newAudio);
      newAudio.play();
      setPlayingTrack(track.id);
      setIsPlaying(true);
  
      // Cập nhật hình ảnh album
      if (track.album && track.album.images && track.album.images.length > 0) {
        setTrackImage(track.album.images[0].url);
      }
  
      // Xử lý khi bài hát kết thúc
      newAudio.onended = () => {
        setPlayingTrack(null);
        setIsPlaying(false);
        handleNextTrack();
      };
    }
  };
  
  
     // Chuyển đến bài hát tiếp theo
     const handleNextTrack = () => {
      if (isRandom) {
        // Chọn bài hát ngẫu nhiên
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * searchResults.length);
        } while (!searchResults[randomIndex].preview_url); // Đảm bảo bài hát có preview_url
        handlePlayPause(searchResults[randomIndex]);
      } else {
        // Chọn bài hát tiếp theo bình thường
        const currentIndex = searchResults.findIndex(track => track.id === playingTrack);
        let nextIndex = currentIndex + 1;
    
        // Tìm bài tiếp theo có preview_url
        while (nextIndex < searchResults.length && !searchResults[nextIndex].preview_url) {
          nextIndex++;
        }
    
        if (nextIndex < searchResults.length) {
          handlePlayPause(searchResults[nextIndex]);
        } else if (repeatMode === 2) {
          // Repeat All: Quay lại bài đầu tiên có preview_url
          const firstTrackWithPreview = searchResults.find(track => track.preview_url);
          if (firstTrackWithPreview) {
            handlePlayPause(firstTrackWithPreview);
          }
        }
      }
    };
    
    
//scroll view to position 
  const cdRef = useRef(null);
  const cdThumbRef = useRef(null);
  const initialSize = 200; // Kích thước ban đầu của .cd
  const minSize = 80; // Kích thước tối thiểu khi cuộn

  useEffect(() => {
    const handleScroll = () => {
      const cd = cdRef.current;
      const cdThumb = cdThumbRef.current;
      if (cd && cdThumb) {
        // Tính toán kích thước mới dựa trên vị trí cuộn
        const scrollY = window.scrollY;
        const newSize = Math.max(minSize, initialSize - scrollY / 2);

        // Cập nhật kích thước của đĩa
        cd.style.width = `${newSize}px`;
        cd.style.height = `${newSize}px`;

        // Đảm bảo tỷ lệ luôn là hình tròn
        cdThumb.style.width = '100%';
        cdThumb.style.paddingTop = '100%';
      }
    };

    // Lắng nghe sự kiện scroll
    window.addEventListener('scroll', handleScroll);

    // Dọn dẹp sự kiện khi component bị hủy
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  // Hàm thay đổi chế độ Repeat
 // 0: Repeat Off, 1: Repeat One, 2: Repeat All
 
  // Hàm thay đổi chế độ Repeat
  const handleRepeat = () => {
    setRepeatMode((prevMode) => {
      if (prevMode === 0) return 1;  // Chuyển sang Repeat One
      if (prevMode === 1) return 2;  // Chuyển sang Repeat All
      return 0;  // Tắt Repeat
    });
  };

  const handleProgressChange = (e) => {
    const newTime = (e.target.value / 100) * duration; // Tính thời gian mới
    audio.currentTime = newTime; // Cập nhật thời gian trong trình phát nhạc
    setCurrentTime(newTime); // Cập nhật trạng thái
  };
  return (
    <div className="player">
      <div className="dashboard">
        <header>
          <h4>Now playing:</h4>
          <h2>{playingTrack ? searchResults.find(track => track.id === playingTrack)?.name : 'None'}</h2>
        </header>
        <div className="cd" ref={cdRef}>
        {/* Hiển thị ảnh bài hát nếu có */}
        <div
      className={`cd-thumb ${!isPlaying ? 'pause' : ''}`}
      style={{
        backgroundImage: trackImage
          ? `url(${trackImage})`
          : 'url(./default-image.jpg)',
      }}
      ></div>
      </div>
        
        {/* Nút điều khiển */}
        <div className="control">
        <div
            className={`btn btn-repeat ${repeatMode > 0 ? 'active' : ''}`}
            onClick={handleRepeat}
          >
            <FontAwesomeIcon icon={faRedo} />
          </div>
          <div className="btn btn-prev" onClick={handlePrevTrack}>
            <FontAwesomeIcon icon={faStepBackward} />
          </div>
          <div
  className="btn btn-toggle-play"
  onClick={() => {
    if (playingTrack) {
      handlePlayPause(searchResults.find(track => track.id === playingTrack));
    }
  }}
>
  <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
</div>
          <div className="btn btn-next" onClick={handleNextTrack}>
            <FontAwesomeIcon icon={faStepForward} />
          </div>
          <div
              className={`btn btn-random ${isRandom ? 'active' : ''}`}
              onClick={() => setIsRandom(!isRandom)}
            >
              <FontAwesomeIcon icon={faRandom} />
          </div>
        </div>
        {/* Slider tiến độ */}
        <input
          id="progress"
          className="progress"
          type="range"
          value={(currentTime / duration) * 100 || 0} // Tính phần trăm
          step="1"
          min="0"
          max="100"
          onChange={handleProgressChange} // Xử lý khi người dùng kéo
        />
  
        {/* Audio player */}
        <audio id="audio" src=""></audio>
        
      {/* Form tìm kiếm */}
      <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks"
            className="search-input"
          />
          <button type="submit" className="search-button">
            <FontAwesomeIcon icon={faSearch} />
          </button>
        </form>
      </div>
    {/* Danh sách bài hát */}
<div className="playlist">
  {searchResults.map((track) => {
    const isPlayingCurrentTrack = playingTrack === track.id && isPlaying;

    return (
        <div
          key={track.id}
          className={`song ${playingTrack === track.id ? 'active' : ''}`}
          onClick={() => handlePlayPause(track)}
        >
          <div
            className="thumb"
            style={{ backgroundImage: `url(${track.album.images[0].url})` }}
          ></div>
          <div className="body">
            <div className="title">{track.name}</div>
            <div className="author">{track.artists[0].name}</div>
          </div>
          <div className="option">
            {/* Hiển thị nút phát/tạm dừng dựa trên trạng thái của bài hát */}
            <FontAwesomeIcon icon={isPlayingCurrentTrack ? faPause : faPlay} />
          </div>
        </div>
               );
           })}
         </div>
        {/* Thêm bài hát */}
        <div className="add_Song">
        <FontAwesomeIcon icon={faPlus} />
      </div>
    </div>
  );
};

export default App;

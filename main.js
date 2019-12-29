"use strict";

// debug trace
// const startup_date = Date.now();
// const dtr = (...params) => console.log(`TRACE:${Date.now() - startup_date}:`, params)
// dtr("debug", "trace", 1, 2, 3, 4, new Date, "test");

const dtr = console.log

const vm = new Vue({
  el: "#vue-app",
  data: {
    users: [],          // include myself
    local_stream: null, // myself
    local_screen: null, // screen share stream
    debug: {
      self_translation: false
    },
    feature: {
      transcription: false,
      translation: false,
      speech: false,
      mute_remote_voice: false,
      lang: 'ja-JP',
    },
    transcription: {
      recognizer: null,
      pause: false,
      message: null
    },
    translation: {
      api: "",
    },
    messages: [],
    skyway: {
      mode: { label: "Mesh", value: "mesh" },
      peer: null,
      call: null,
      room: null,
      peerId: null,
      callto: null,
      stats: "",
      transmit: "sr"
    },
    microphone: {
      device: [],
      using: null,
      mute: false,
    },
    speaker: {
      device: [],
      using: null,
      mute: false,
      selectable: 'sinkId' in HTMLMediaElement.prototype,
      volume: 1.0
    },
    camera: {
      device: [],
      using: null,
    },
    video: {
      codec: "",
      size: null,
      fps: null,
      bandwidth: "",
    },
    audio: {
      codec: "",
      bandwidth: "",
    },
    renderer: { label: "Cover", value: "cover" },
    layout: { label: "Auto", value: "auto" },
  },
  methods: {
    on_call: function () {
      dtr(`on_call`)
      // disconnect
      if (this.skyway.call) {
        this.skyway.call.close();
        this.skyway.call = null;
        return;
      }
      else if (this.skyway.room) {
        this.skyway.room.close();
        this.skyway.room = null;
        return;
      }

      if (this.skyway.mode.value == "p2p") {

        // setup options
        const options = {};
        if (this.video.codec != "") {
          options.videoCodec = this.video.codec.value;
        }
        if (this.audio.codec != "") {
          options.audioCodec = this.audio.codec.value;
        }
        if (this.video.bandwidth != "") {
          options.videoBandwidth = this.video.bandwidth.value
        }
        if (this.audio.bandwidth != "") {
          options.audioBandwidth = this.audio.bandwidth.value
        }
        if (this.is_recvonly) {
          options.videoReceiveEnabled = true
          options.audioReceiveEnabled = true
        }
        dtr(`options`, options);

        // call
        this.skyway.call = this.skyway.peer.call(this.skyway.callto, this.is_recvonly ? null : this.get_localstream_outbound(), options);
        dtr(`call`, this.skyway.call);

        this.step4(this.skyway.call);
      }
      else if (this.skyway.mode.value == "mesh") {
        const options = { mode: 'mesh', stream: this.is_recvonly ? null : this.get_localstream_outbound() };
        if (this.video.codec != "") {
          options.videoCodec = this.video.codec.value;
        }
        if (this.audio.codec != "") {
          options.audioCodec = this.audio.codec.value;
        }
        if (this.video.bandwidth != "") {
          options.videoBandwidth = this.video.bandwidth.value
        }
        if (this.audio.bandwidth != "") {
          options.audioBandwidth = this.audio.bandwidth.value
        }
        if (this.is_recvonly) {
          options.videoReceiveEnabled = true
          options.audioReceiveEnabled = true
        }
        dtr(`options`, options);

        this.skyway.room = this.skyway.peer.joinRoom('mesh_video_' + this.skyway.callto, options);
        dtr(`room`, this.skyway.room);

        this.step3(this.skyway.room);
      }
      else if (this.skyway.mode.value == "sfu") {
        const options = { mode: 'sfu', stream: this.get_localstream_outbound() };
        dtr(`options`, options);

        this.skyway.room = this.skyway.peer.joinRoom('sfu_video_' + this.skyway.callto, options);
        dtr(`room`, this.skyway.room);

        this.step3(this.skyway.room);
      }

    },
    update_hash: function () {
      dtr(`update_hash:`)
      let hash = "";
      if (this.is_p2p) {
        hash = `#p2p-${this.skyway.peer.id}`
      }
      else if (this.is_mesh && this.skyway.room) {
        hash = `#mesh-${this.skyway.callto}`
      }
      else if (this.is_sfu && this.skyway.room) {
        hash = `#sfu-${this.skyway.callto}`
      }
      location.hash = hash
    },
    on_click_video: function (stream) {
      dtr(`on_click_video:`, stream)
      if (this.users.length <= 1) return;
      const users = this.users.filter(user => user.stream && user.stream.id == stream.id);
      this.users = users.concat(this.users.filter(user => !user.stream || user.stream.id != stream.id))
      this.update_video_layout();
    },
    on_select_size: function (item) {
      dtr(`on_select_size`, item.label)
      if (this.video.size == item) {
        this.video.size = null;
      }
      else {
        this.video.size = item;
      }
      this.step2(this.get_constraints());
    },
    on_select_fps: function (item) {
      dtr(`on_select_fps`, item.label)
      if (this.video.fps == item) {
        this.video.fps = null;
      }
      else {
        this.video.fps = item;
      }
      this.step2(this.get_constraints());
    },
    on_select_camera: function (device) {
      dtr(`on_select_camera`, device.label)
      if (this.camera.using == device) {
        this.camera.using = null;
      }
      else {
        this.camera.using = device;
      }
      this.step2(this.get_constraints());
    },
    on_select_microphone: function (device) {
      dtr(`on_select_microphone`, device.label)
      if (this.microphone.using == device) {
        this.microphone.using = null;
      }
      else {
        this.microphone.using = device;
      }
      this.step2(this.get_constraints());
    },
    on_select_microphone_mute: function () {
      dtr(`on_select_microphone_mute`)
      this.microphone.mute = !this.microphone.mute;
      // replace stream
      if (this.skyway.call) {
        this.skyway.call.replaceStream(this.get_localstream_outbound());
      }
      else if (this.skyway.room) {
        this.skyway.room.replaceStream(this.get_localstream_outbound());
      }
    },
    on_select_speaker: function (device) {
      dtr(`on_select_speaker`, device.label)
      if (!this.speaker.selectable) return
      if (this.speaker.using == device) {
        this.speaker.using = null;
      }
      else {
        this.speaker.using = device;
      }
    },
    on_select_speaker_mute: function () {
      dtr(`on_select_speaker_mute`)
      this.speaker.mute = !this.speaker.mute;
    },
    on_select_renderer: function (item) {
      dtr(`on_select_renderer`, item.label)
      this.renderer = item;
    },
    on_select_layout: function (item) {
      dtr(`on_select_layout`, item.label)
      this.layout = item;
      this.update_video_layout();
    },
    on_select_screen_share: async function () {
      dtr(`on_select_screen_share:`);

      if (this.local_screen) {
        dtr("stop screen share");

        let stream_tmp = this.local_screen
        this.local_screen = null;

        this.set_stream(this.skyway.peer.id, this.get_localstream_video());
        if (this.skyway.call) {
          this.skyway.call.replaceStream(this.get_localstream_outbound());
        }
        else if (this.skyway.room) {
          this.skyway.room.replaceStream(this.get_localstream_outbound());
        }
        else {
          dtr("replace stream error.");
        }

        stream_tmp.getTracks().forEach(track => track.stop());

      }
      else {
        this.local_screen = navigator.mediaDevices.getDisplayMedia ? 
          await navigator.mediaDevices.getDisplayMedia( { video: true, audio: true } ) :
          await navigator.mediaDevices.getUserMedia( {video: {mediaSource: "screen"}} );
        if (!this.local_screen) {
          alert("Screen share is not available.")
          return;
        };
        dtr(this.local_screen)

        this.local_screen.getVideoTracks().forEach( track => {
          track.addEventListener('ended', () => {
            this.on_select_screen_share()
          })
        }, {once: true})

        // set screen share stream to self video(video track only).
        this.set_stream(this.skyway.peer.id, this.get_localstream_video());

        if (this.skyway.call) {
          this.skyway.call.replaceStream(this.get_localstream_outbound());
        }
        else if (this.skyway.room) {
          this.skyway.room.replaceStream(this.get_localstream_outbound());
        }
        else {
          dtr("replace stream error.");
        }
      }
    },
    on_select_recognition: function () {
      dtr(`on_select_recognition:`);
      jQuery('#modal-recognition').modal({show:true, backdrop:'static'});
    },
    on_hidden_recognition_modal: function() {
      dtr('on_hidden_recognition_modal');
      this.stop_recognition();
      if (this.feature.transcription) {
        this.start_recognition();
      }
    },
    start_recognition: function() {
      dtr('start_recognition');
      dtr('lang', this.feature.lang);

      this.transcription.recognizer = new webkitSpeechRecognition();
      // this.transcription.recognizer.continuous = true;
      this.transcription.recognizer.interimResults = true;
      this.transcription.recognizer.lang = this.feature.lang;

      this.transcription.recognizer.onaudiostart = function() { dtr("recognition.onaudiostart"); }
      this.transcription.recognizer.onaudioend = function() { dtr("recognition.onaudioend"); }
      this.transcription.recognizer.onnomatch = function() { dtr("recognition.onnomatch"); }
      this.transcription.recognizer.onsoundstart = function() { dtr("recognition.onsoundstart"); }
      this.transcription.recognizer.onsoundend = function() { dtr("recognition.onsoundend"); }
      this.transcription.recognizer.onspeechstart = function() { dtr("recognition.onspeechstart"); }
      this.transcription.recognizer.onspeechend = function() { dtr("recognition.onspeechend"); }
      this.transcription.recognizer.onstart = function() { dtr("recognition.onstart"); }

      this.transcription.recognizer.onerror = (event) => {
         dtr("recognition.onerror", event);
         this.transcription.message = null;
      }

      this.transcription.recognizer.onresult = (event) => {
        dtr(`recognition.onresult`, event);
        const result = event.results[event.resultIndex];
        const isFinal = result.isFinal;
        const text = result[0].transcript;
        if (this.transcription.message) {
          this.transcription.message.text = text;
          if (isFinal) {
            this.transcription.message.unresolved = false;
            if (this.skyway.room) {
              this.skyway.room.send({ command: "speechRecognition", data: this.transcription.message})
            }
            // {
            //   // debug code
            //   // this.speech_message(this.transcription.message);
            // }
            if (this.debug.self_translation) {
              this.translate_message(this.transcription.message, this.feature.lang, this.feature.lang == "ja-JP" ? "en-US" : "ja-JP");
            }
            this.transcription.message = null;
          }
        }
        else {
          this.transcription.message = new Object();
          this.transcription.message = {
            text: text,
            lang: this.feature.lang,
            unresolved: true
          };
          this.add_message(this.transcription.message);
        }
      }
      this.transcription.recognizer.onend = () => {
        dtr(`recognition.onend:`);

        if (this.transcription.message && this.transcription.message.unresolved) {
          // this.messages.shift();
          this.transcription.message = null;
        }

        if (this.feature.transcription && this.transcription.recognizer && !this.transcription.pause) {
          this.transcription.recognizer.start();
        }
      }
      this.transcription.pause = false;
      this.transcription.recognizer.start();
    },
    stop_recognition: function() {
      dtr('stop_recognition');
      if (this.transcription.recognizer) {
        this.transcription.recognizer.stop();
      }
      this.transcription.recognizer = null;
    },
    on_pause_recognition: function(pause) {
      dtr('on_pause_recognition', pause);

      if (!this.feature.transcription) return;
      if (!this.transcription.recognizer) return;

      this.transcription.pause = pause;

      if (pause) this.transcription.recognizer.stop();
      else this.transcription.recognizer.start();
    },
    update_video_layout: function () {
      dtr(`update_video_layout:`)
      if (this.layout.value == "pinp") {
        const w = window.innerWidth
        const h = window.innerHeight - $(".navbar").outerHeight()
        const thumbnail_h = h * 0.25;
        const thumbnail_w = thumbnail_h * 16 / 9;
        this.users.forEach((user, index) => {
          if (index == 0) {
            user.style = {
              top: "0px",
              left: "0px",
              width: "100%",
              height: "100%",
              position: "absolute",
              zIndex: 1,
            }
          }
          else {
            user.style = {
              bottom: "0px",
              right: 10 * (index - 1) + thumbnail_w * (index - 1) + "px",
              width: `${thumbnail_w}px`,
              height: `${thumbnail_h}px`,
              position: "absolute",
              zIndex: 2,
            }
          }
          Vue.set(this.users, index, user);
        });
      }
      else if (this.layout.value == "grid") {
        if (this.users.length == 1) {
          const user = this.users[0];
          user.style = {
            top: "0px",
            left: "0px",
            width: "100%",
            height: "100%",
            position: "absolute",
            zIndex: 1,
          }
          Vue.set(this.users, 0, user);
        }
        else if (this.users.length == 2) {
          let user = this.users[0];
          user.style = {
            top: "0px",
            left: "0px",
            width: "50%",
            height: "100%",
            position: "absolute",
            zIndex: 1,
          }
          Vue.set(this.users, 0, user);

          user = this.users[1];
          user.style = {
            top: "0px",
            left: "50%",
            width: "50%",
            height: "100%",
            position: "absolute",
            zIndex: 1,
          }
          Vue.set(this.users, 1, user);
        }
        else if (this.users.length <= 16) {
          let d = 0;
          for (let i = 0; i < 4; i++) {
            if (i * i >= this.users.length) {
              d = i;
              break;
            }
          }
          let y = 0;
          let x = 0;
          for (let i = 0; i < this.users.length; i++) {
            if (i != 0 && i % d == 0) y++;
            x = (i % d);
            let user = this.users[i];
            user.style = {
              top: y * 100 / d + "%",
              left: x * 100 / d + "%",
              width: 100 / d + "%",
              height: 100 / d + "%",
              position: "absolute",
              zIndex: 1,
            }
            Vue.set(this.users, i, user);
          }
        }
      }
      else if (this.layout.value == "auto") {
        if (this.users.length == 1) {
          const user = this.users[0];
          user.style = {
            top: "0px",
            left: "0px",
            width: "100%",
            height: "100%",
            position: "absolute",
            zIndex: 1,
          }
          Vue.set(this.users, 0, user);
        }
        else if (this.users.length == 2) {
          const w = window.innerWidth
          const h = window.innerHeight - $(".navbar").outerHeight()
          const thumbnail_h = h * 0.25;
          const thumbnail_w = thumbnail_h * 16 / 9;
          this.users.forEach((user, index) => {
            if (index == 0) {
              user.style = {
                top: "0px",
                left: "0px",
                width: "100%",
                height: "100%",
                position: "absolute",
                zIndex: 1,
              }
            }
            else {
              user.style = {
                bottom: "0px",
                right: 10 * (index - 1) + thumbnail_w * (index - 1) + "px",
                width: `${thumbnail_w}px`,
                height: `${thumbnail_h}px`,
                position: "absolute",
                zIndex: 2,
              }
            }
            Vue.set(this.users, index, user);
          });
        }
        else if (this.users.length == 3) {
          const ratio = 0.65
          const w = window.innerWidth
          const h = window.innerHeight - $(".navbar").outerHeight()
          let v_t = 0
          let v_l = 0
          let v_w = 0
          let v_h = 0
          let user = null

          v_w = ratio * w
          v_h = h
          user = this.users[0];
          user.style = {
            top: "0px",
            left: "0px",
            width: `${v_w}px`,
            height: `${v_h}px`,
            position: "absolute",
            zIndex: 1,
          }
          Vue.set(this.users, 0, user);

          v_t = 0
          v_l = ratio * w
          v_w = (1.0 - ratio) * w
          v_h = 0.5 * h
          user = this.users[1];
          user.style = {
            top: "0px",
            left: `${v_l}px`,
            width: `${v_w}px`,
            height: `${v_h}px`,
            position: "absolute",
            zIndex: 1,
          }
          Vue.set(this.users, 1, user);

          v_t = 0.5 * h
          v_l = ratio * w
          v_w = (1.0 - ratio) * w
          v_h = 0.5 * h
          user = this.users[2];
          user.style = {
            top: `${v_t}px`,
            left: `${v_l}px`,
            width: `${v_w}px`,
            height: `${v_h}px`,
            position: "absolute",
            zIndex: 1,
          }
          Vue.set(this.users, 2, user);
        }
        else if (this.users.length <= 16) {
          let d = 0;
          for (let i = 0; i < 4; i++) {
            if (i * i >= this.users.length) {
              d = i;
              break;
            }
          }
          let y = 0;
          let x = 0;
          for (let i = 0; i < this.users.length; i++) {
            if (i != 0 && i % d == 0) y++;
            x = (i % d);
            let user = this.users[i];
            user.style = {
              top: y * 100 / d + "%",
              left: x * 100 / d + "%",
              width: 100 / d + "%",
              height: 100 / d + "%",
              position: "absolute",
              zIndex: 1,
            }
            Vue.set(this.users, i, user);
          }
        }
      }
    },
    create_user: function (peerId) {
      dtr(`create_user:${peerId}`)
      return {
        peerId: peerId,
        stream: null,
      }
    },
    set_stream: function (peerId, stream) {
      dtr(`set_stream:${peerId}`)
      dtr(stream)
      if (this.users.filter(user => user.peerId == peerId).length == 0) {
        const user = this.create_user(peerId);
        user.stream = stream;
        this.users.unshift(user);
      }
      else {
        this.users.forEach(user => {
          if (user.peerId == peerId) user.stream = stream;
        });
      }
      this.update_video_layout();
    },
    get_streams: function (peerId) {
      dtr(`get_streams:${peerId}`)
      return this.users.filter(user => user.peerId == peerId).map(user => user.stream);
    },
    remove_stream: function (peerId, stream) {
      dtr(`remove_stream:${peerId}`)
      dtr(stream)
      this.users.forEach(user => {
        if (user.peerId == peerId && user.stream == stream) user.stream = null;
      });
      this.update_video_layout();
    },
    join_user: function (peerId) {
      dtr(`join_user:${peerId}`)
      this.users.unshift(this.create_user(peerId));
      this.update_video_layout();
    },
    leave_user: function (peerId) {
      dtr(`leave_user:${peerId}`)
      this.users = this.users.filter(user => user.peerId != peerId);
      this.update_video_layout();
    },
    leave_others: function () {
      dtr(`leave_others:`)
      this.users = this.users.filter(user => user.peerId == this.skyway.peer.id);
      this.update_video_layout();
    },
    get_constraints: function () {
      dtr(`get_constraints:`)
      const ct = { video: false, audio: false };
      if (this.camera.device && this.camera.device.length) {
        const fmt = {};
        if (this.camera.using) {
          fmt.deviceId = {
            exact : this.camera.using.deviceId
          }
        }
        if (this.video.size) {
          fmt.width = {
            exact : this.video.size.value.width
          }
          fmt.height = {
            exact : this.video.size.value.height
          }
        }
        if (this.video.fps) {
          fmt.frameRate = {
            exact : this.video.fps.value
          }
        }
        if (Object.keys(fmt).length) {
          ct.video = fmt;
        }
        else {
          ct.video = true;
        }
      }
      if (this.microphone.device && this.microphone.device.length) {
        const fmt = {};
        if (this.microphone.using) {
          fmt.deviceId = this.microphone.using.deviceId;
        }
        if (Object.keys(fmt).length) {
          ct.audio = fmt;
        }
        else {
          ct.audio = true;
        }
      }
      return ct;
    },
    step1: async function () {
      dtr(`step1:`)

      // enumerate devices
      let devices = await navigator.mediaDevices.enumerateDevices().catch(err => {
        dtr(err)
        alert(`${err.name}:${err.message}`);
        return
      })

      this.update_devicelist(devices);

      if (this.microphone.device.length == 0 && this.camera.device.length == 0) {
        alert("Error, No microphone and camera.")
        return;
      }

      const constraints = { video: false, audio: false };
      if (this.microphone.device.length) constraints.audio = true;
      if (this.camera.device.length) constraints.video = true;

      if (this.is_sendrecv || this.is_sendonly) {
        // gUM
        this.local_stream = await navigator.mediaDevices.getUserMedia(constraints).catch(err => {
          dtr(err)
          alert(`${err.name}:${err.message}:${err.constraintName}`);
          return
        })
        dtr(this.local_stream)
        this.local_stream.getTracks().forEach(dtr)
        // set my steram(only video tracks)
        this.set_stream(this.skyway.peer.id, this.get_localstream_video());
      }

      // rescan devices to get details(device name...).
      devices = await navigator.mediaDevices.enumerateDevices().catch(err => {
        dtr(err)
        alert(`${err.name}:${err.message}`);
        return
      })
      this.update_devicelist(devices);

      if (this.is_sendrecv || this.is_sendonly) {
        this.local_stream.getVideoTracks().forEach(track => {
          this.camera.device.forEach(device => {
            if (track.label == device.label) this.camera.using = device;
          });
        });
        dtr(`this.camera.using`, this.camera.using)

        this.local_stream.getAudioTracks().forEach(track => {
          this.microphone.device.forEach(device => {
            if (track.label == device.label) this.microphone.using = device;
          });
        });
        dtr(`this.microphone.using`, this.microphone.using)
      }

      if (this.speaker.device.length) this.speaker.using = this.speaker.device[0];
      dtr(`this.speaker.using`, this.speaker.using)

      // call automatically
      if (this.skyway.callto) this.on_call()
    },
    step2: async function (constraints) {
      dtr(`step2`, constraints)

      // stop stream
      if (this.local_stream) {
        this.local_stream.getTracks().forEach(track => track.stop())
      }

      // gUM
      let stream = await navigator.mediaDevices.getUserMedia(constraints).catch(err => {
        dtr(err)
        alert(`${err.name}:${err.message}:${err.constraintName}`);
        return
      })
      if (stream == null) return
      this.local_stream = stream
      dtr(`stream`, this.local_stream)
      dtr(`track`)
      this.local_stream.getTracks().forEach(dtr)

      // set my steram(only video tracks)
      this.set_stream(this.skyway.peer.id, this.get_localstream_video());

      // replace stream
      if (this.skyway.call) {
        this.skyway.call.replaceStream(this.get_localstream_outbound());
      }
      else if (this.skyway.room) {
        this.skyway.room.replaceStream(this.get_localstream_outbound());
      }
    },
    step3: function (room) {
      dtr(`step3`, room)

      this.update_hash()

      // Wait for stream on the call, then set peer video display
      room.on('stream', stream => {
        dtr("room.on('stream'", stream)
        if (this.is_sendrecv || this.is_recvonly) {
          this.set_stream(stream.peerId, stream);
        }
      });

      room.on('removeStream', stream => {
        dtr("room.on('removeStream'", stream)
        this.remove_stream(stream.peerId, stream);
      });

      room.on('peerJoin', peerId => {
        dtr("room.on('peerJoin'", peerId)
        // if (this.is_sendrecv || this.is_recvonly) {
        //   this.join_user(peerId);
        // }
      })

      room.on('peerLeave', peerId => {
        dtr("room.on('peerLeave'", peerId)
        this.leave_user(peerId);
      });

      room.on('log', log => {
        dtr("room.on('log'", log)
      });

      room.on('data', data => {
        dtr("room.on('data'", data)
        const recv_from = data.src;
        const recv_data = data.data;
        if (recv_data.command == "speechRecognition") {
          const message = recv_data.data;
          message.from = recv_from;
          this.add_message(message);
          if (this.feature.translation) {
            this.translate_message(message, message.lang, this.feature.lang);
          }
        }
      });

      room.on('close', () => {
        dtr("room.on('close'")
        this.leave_others();
        this.skyway.room = null;
        this.update_hash()
      });
    },
    step4: function (call) {
      dtr(`step4`, call)

      this.update_hash()

      // Wait for stream on the call, then set peer video display
      call.on('stream', stream => {
        dtr("call.on('stream'", stream)
        if (this.is_sendrecv || this.is_recvonly) {
          this.set_stream(this.skyway.call.remoteId, stream);
        }
      });
      call.on('removeStream', stream => {
        dtr("call.on('removeStream'", stream)
      });
      call.on('close', () => {
        dtr("call.on('close'")
        this.leave_user(this.skyway.call.remoteId);
      });
    },
    update_devicelist: function (devices) {
      dtr(`update_devicelist`, devices)

      this.microphone.device = []
      this.speaker.device = []
      this.camera.device = []

      for (let i = 0; i !== devices.length; ++i) {
        dtr(devices[i])
        const deviceInfo = devices[i];
        if (deviceInfo.kind === 'audioinput') {
          this.microphone.device.push(deviceInfo)
        } else if (deviceInfo.kind === 'audiooutput') {
          this.speaker.device.push(deviceInfo)
        } else if (deviceInfo.kind === 'videoinput') {
          this.camera.device.push(deviceInfo)
        }
      }
      if (this.microphone.using) {
        let i = 0;
        for (; i < this.microphone.device.length; i++) {
          if (this.microphone.using.deviceId == this.microphone.device[i].deviceId) break;
        }
        if (i == this.microphone.device.length) this.microphone.using = null;
      }
      if (this.speaker.using) {
        let i = 0;
         for (; i < this.speaker.device.length; i++) {
          if (this.speaker.using.deviceId == this.speaker.device[i].deviceId) break;
        }
        if (i == this.speaker.device.length) this.speaker.using = null; 
      }
      if (this.camera.using) {
        let i = 0;
        for (; i < this.camera.device.length; i++) {
          if (this.camera.using.deviceId == this.camera.device[i].deviceId) break;
        }
        if (i == this.camera.device.length) this.camera.using = null;
      }
    },
    get_silent_audio_track: function() {
      return new AudioContext().createMediaStreamDestination().stream.getAudioTracks()[0];
    },
    get_localstream_video: function() {
      if (this.local_screen) {
        return new MediaStream(this.local_screen.getVideoTracks());
      }
      else if (this.local_stream && this.local_stream.getVideoTracks().length) {
        return new MediaStream(this.local_stream.getVideoTracks())
      }
      return new MediaStream();
    },
    get_localstream_outbound: function() {
      dtr(`get_localstream_outbound`)
      // video track
      const outbound_stream = new MediaStream(this.local_screen ? this.local_screen.getVideoTracks() : this.local_stream.getVideoTracks());
      // audio track
      if (this.microphone.mute) {
        outbound_stream.addTrack(this.get_silent_audio_track());
      }
      else {
        if (this.local_stream.getAudioTracks().length) {
          outbound_stream.addTrack(this.local_stream.getAudioTracks()[0]);
        }
        else {
          outbound_stream.addTrack(this.get_silent_audio_track());
        }
      }
      dtr(`getVideoTracks details`)
      outbound_stream.getVideoTracks().forEach(track => dtr(track.getSettings()))
      outbound_stream.getVideoTracks().forEach(track => dtr(track.getConstraints()))
      outbound_stream.getVideoTracks().forEach(track => dtr(track.getCapabilities ? track.getCapabilities() : "no capabilities"))
      dtr(`getAudioTracks details`)
      outbound_stream.getAudioTracks().forEach(track => dtr(track.getSettings()))
      outbound_stream.getAudioTracks().forEach(track => dtr(track.getConstraints()))
      outbound_stream.getAudioTracks().forEach(track => dtr(track.getCapabilities ? track.getCapabilities() : "no capabilities"))

      return outbound_stream;
    },
    add_message: function (message) {
      dtr('add_message', message)
      this.messages.unshift(message);
    },
    speech_message: function (message) {
      dtr('speech_message', message)

      if (!this.feature.speech) return;

      const ss = new SpeechSynthesisUtterance();
      ss.text = message.text;
      ss.lang = message.lang;
      ss.onstart = (event) => {
        this.on_pause_recognition(true);
      }
      ss.onend = (event) => {
        this.on_pause_recognition(false);
      }
      ss.onerror = (event) => {
        dtr('SpeechSynthesisUtterance.onerror', event);
        this.on_pause_recognition(false);
      }
      ss.onpause = (event) => {
        dtr('SpeechSynthesisUtterance.onpause', event);
      }
      ss.onresume = (event) => {
        dtr('SpeechSynthesisUtterance.onresume', event);
      }

      this.on_pause_recognition(true);
      speechSynthesis.speak(ss);
    },
    translate_message: function (message, from, to) {
      dtr('translate_message', message, from, to)

      if (this.translation.api == "") return;
      if (!from || !to || (from == to)) return;

      const source = from == "ja-JP" ? "ja" : "en";
      const target = to   == "ja-JP" ? "ja" : "en";
      const query = `${this.translation.api}?text=${message.text}&source=${source}&target=${target}`

      dtr('translate_message', query)

      fetch(query)
        .then(response => {
          dtr('translate_message', response)
          return response.text()
        }).then(text => {
          dtr('translate_message', text)
          const message_translate = {
            text: text,
            lang: to,
            translate: true
          }
          this.add_message(message_translate);
          this.speech_message(message_translate);
        }).catch(error => dtr('translate_message', error))
    },
    on_speaker_volume: function(item) {
      this.speaker.volume = item.value
    },
    on_toggle_fullscreen: function() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    },
    on_setup: function () {
      // Create Peer object
      const options = {
        key: window.__SKYWAY_KEY__,
        debug: 3,
      }
      if (this.is_p2p && this.skyway.peerId) {
        this.skyway.peer = new Peer(this.skyway.peerId, options)
      }
      else {
        this.skyway.peer = new Peer(options)
      }
      dtr(`this.skyway.peer`, this.skyway.peer)

      const peer = this.skyway.peer; // alias

      peer.on('open', (id) => {
        dtr("peer.on('open'")

        // Update location url on browser.
        this.update_hash()

        // gUM
        this.step1(null);
      })

      peer.on('error', err => {
        dtr("peer.on('error'", err)
        alert(err.message);
        this.skyway.call = null;
      });

      peer.on('disconnected', id => {
        dtr("peer.on('disconnected'", id)
        this.skyway.call = null;
      });

      peer.on('call', call => {
        dtr("peer.on('call'", call)

        this.skyway.call = call;

        const options = {};
        if (this.video.codec != "") {
          options.videoCodec = this.video.codec.value;
        }
        if (this.audio.codec != "") {
          options.audioCodec = this.audio.codec.value;
        }
        if (this.video.bandwidth != "") {
          options.videoBandwidth = this.video.bandwidth.value
        }
        if (this.audio.bandwidth != "") {
          options.audioBandwidth = this.audio.bandwidth.value
        }
        dtr(options);

        this.skyway.call.answer(this.is_recvonly ? null : this.get_localstream_outbound(), options);
        this.step4(this.skyway.call);
      });
    },
    on_speaker_volume: function() {
      jQuery('#modal-speaker-volume').modal({show:true, backdrop:'static'})
    },
  },
  computed: {
    rendererUsers: function () {
      return this.users.filter(user => user.stream);
    },
    styleCover: function () {
      return { "video cover": this.renderer.value == "cover" }
    },
    is_online: function () {
      return (this.skyway.call || this.skyway.room) ? true : false;
    },
    is_offline: function () {
      return !this.skyway.call && !this.skyway.room;
    },
    is_p2p: function () {
      return this.skyway.mode.value == "p2p";
    },
    is_mesh: function () {
      return this.skyway.mode.value == "mesh";
    },
    is_sfu: function () {
      return this.skyway.mode.value == "sfu";
    },
    is_codec_selectable: function () {
      return this.skyway.mode.value != "sfu" && (!this.skyway.call && !this.skyway.room);
    },
    has_camera: function () {
      return this.camera.device && this.camera.device.length
    },
    has_microphone: function () {
      return this.microphone.device && this.microphone.device.length
    },
    has_speaker: function () {
      return this.speaker.device && this.speaker.device.length
    },
    support_speech_recognition: function () {
      return 'webkitSpeechRecognition' in window
    },
    is_sendrecv: function () {
      return this.skyway.transmit == "sr"
    },
    is_sendonly: function () {
      return this.skyway.transmit == "s"
    },
    is_recvonly: function () {
      return this.skyway.transmit == "r"
    }
  },
  mounted: function () {
    dtr(`mounted`)

    // Check API KEY
    if (window.__SKYWAY_KEY__ == "") {
      alert("Please set your API KEY to window.__SKYWAY_KEY__")
      return;
    }

    // Check Translation API
    this.translation.api = window.__TRANSLATE_URL__;
    dtr(`translation api: ${this.translation.api}`)

    // Check URL
    const hash = location.hash.match(/^#(p2p|mesh|sfu)-([\w-]+)$/)
    if (hash) {
      dtr(`hash`, hash)
      for (let mode of consts.skyway.mode) {
        if (mode.value == hash[1]) {
          this.skyway.mode = mode
          if (this.is_p2p) {
            this.skyway.peerId = hash[2];
            dtr(`peerId`, this.skyway.peerId)
          }
          else if (this.is_mesh || this.is_sfu) {
            this.skyway.callto = hash[2];
            dtr(`callto`, this.skyway.callto)
          }
          break;
        }
      }
    }

    jQuery('#modal-recognition').on('hidden.bs.modal', (e) => {
      this.on_hidden_recognition_modal();
    })

    jQuery('#modal-settings').on('hidden.bs.modal', (e) => {
      this.on_setup();
    })
    jQuery('#modal-settings').modal({show:true, backdrop:'static'});

  },
  directives: {
    videostream: {
      bind(el, binding) {
        dtr(`directives:videostream:bind`)
        dtr(binding)
        el.srcObject = binding.value
        el.play();
      },
      update(el, binding) {
        dtr(`directives:videostream:update`)
        dtr(binding)
        if (binding.value !== binding.oldValue) {
          el.srcObject = binding.value
          el.play();
        }
      }
    },
    audiostream: {
      bind(el, binding) {
        dtr(`directives:audiostream:bind`)
        dtr(binding)
        if (vm.speaker.selectable) {
          if (vm.speaker.using && binding.value.getAudioTracks().length) {
            el.setSinkId(vm.speaker.using.deviceId);
          }
        }
        el.srcObject = binding.value
        el.muted = vm.speaker.mute || vm.feature.mute_remote_voice;
        try { el.volume = vm.speaker.volume } catch(e) {}
        el.play();
      },
      update(el, binding) {
        dtr(`directives:audiostream:update`)
        dtr(binding)
        if (vm.speaker.selectable) {
          if (vm.speaker.using && binding.value.getAudioTracks().length) {
            el.setSinkId(vm.speaker.using.deviceId);
          }
        }
        if (binding.value !== binding.oldValue) {
          el.srcObject = binding.value
          el.play();
        }
        el.muted = vm.speaker.mute || vm.feature.mute_remote_voice;
        try { el.volume = vm.speaker.volume } catch(e) {}
      }
    }
  },
  watch: {
  },
});


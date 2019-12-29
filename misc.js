"use strict";

async function getRTCStats(statsObject) {

  let trasportArray = [];
  let candidateArray = [];
  let candidatePairArray = [];
  let inboundRTPAudioStreamArray = [];
  let inboundRTPVideoStreamArray = [];
  let outboundRTPAudioStreamArray = [];
  let outboundRTPVideoStreamArray = [];
  let codecArray = [];
  let mediaStreamTrack_local_audioArray = [];
  let mediaStreamTrack_local_videoArray = [];
  let mediaStreamTrack_remote_audioArray = [];
  let mediaStreamTrack_remote_videoArray = [];
  let candidatePairId = '';
  let localCandidateId = '';
  let remoteCandidateId = '';
  let localCandidate = {};
  let remoteCandidate = {};
  let inboundAudioCodec = {};
  let inboundVideoCodec = {};
  let outboundAudioCodec = {};
  let outboundVideoCodec = {};

  let stats = await statsObject;
  stats.forEach(stat => {
    if (stat.id.indexOf('RTCTransport') !== -1) {
      trasportArray.push(stat);
    }
    if (stat.id.indexOf('RTCIceCandidatePair') !== -1) {
      candidatePairArray.push(stat);
    }
    if (stat.id.indexOf('RTCIceCandidate_') !== -1) {
      candidateArray.push(stat);
    }
    if (stat.id.indexOf('RTCInboundRTPAudioStream') !== -1) {
      inboundRTPAudioStreamArray.push(stat);
    }
    if (stat.id.indexOf('RTCInboundRTPVideoStream') !== -1) {
      inboundRTPVideoStreamArray.push(stat);
    }
    if (stat.id.indexOf('RTCOutboundRTPAudioStream') !== -1) {
      outboundRTPAudioStreamArray.push(stat);
    }
    if (stat.id.indexOf('RTCOutboundRTPVideoStream') !== -1) {
      outboundRTPVideoStreamArray.push(stat);
    }
    if (stat.id.indexOf('RTCMediaStreamTrack_local_audio') !== -1) {
      mediaStreamTrack_local_audioArray.push(stat);
    }
    if (stat.id.indexOf('RTCMediaStreamTrack_local_video') !== -1) {
      mediaStreamTrack_local_videoArray.push(stat);
    }
    if (stat.id.indexOf('RTCMediaStreamTrack_remote_audio') !== -1) {
      mediaStreamTrack_remote_audioArray.push(stat);
    }
    if (stat.id.indexOf('RTCMediaStreamTrack_remote_video') !== -1) {
      mediaStreamTrack_remote_videoArray.push(stat);
    }
    if (stat.id.indexOf('RTCCodec') !== -1) {
      codecArray.push(stat);
    }
  });

  trasportArray.forEach(transport => {
    if (transport.dtlsState === 'connected') {
      candidatePairId = transport.selectedCandidatePairId;
    }
  });
  candidatePairArray.forEach(candidatePair => {
    if (candidatePair.state === 'succeeded' && candidatePair.id === candidatePairId) {
      localCandidateId = candidatePair.localCandidateId;
      remoteCandidateId = candidatePair.remoteCandidateId;
    }
  });
  candidateArray.forEach(candidate => {
    if (candidate.id === localCandidateId) {
      localCandidate = candidate;
    }
    if (candidate.id === remoteCandidateId) {
      remoteCandidate = candidate;
    }
  });

  inboundRTPAudioStreamArray.forEach(inboundRTPAudioStream => {
    codecArray.forEach(codec => {
      if (inboundRTPAudioStream.codecId === codec.id) {
        inboundAudioCodec = codec;
      }
    });
  });
  inboundRTPVideoStreamArray.forEach(inboundRTPVideoStream => {
    codecArray.forEach(codec => {
      if (inboundRTPVideoStream.codecId === codec.id) {
        inboundVideoCodec = codec;
      }
    });
  });
  outboundRTPAudioStreamArray.forEach(outboundRTPAudioStream => {
    codecArray.forEach(codec => {
      if (outboundRTPAudioStream.codecId === codec.id) {
        outboundAudioCodec = codec;
      }
    });
  });
  outboundRTPVideoStreamArray.forEach(outboundRTPVideo => {
    codecArray.forEach(codec => {
      if (outboundRTPVideo.codecId === codec.id) {
        outboundVideoCodec = codec;
      }
    });
  });

  let text = "";
  text += "Local Candidate\n";
  text += localCandidate.ip + ':' + localCandidate.port + '(' + localCandidate.protocol + ')' + '\ntype:' + localCandidate.candidateType;
  text += '\n'
  text += "Remote Candidate\n";
  text += remoteCandidate.ip + ':' + remoteCandidate.port + '(' + remoteCandidate.protocol + ')' + '\ntype:' + remoteCandidate.candidateType;
  text += '\n'
  text += "Inbound Codec\n";
  text += inboundVideoCodec.mimeType + '\n' + inboundAudioCodec.mimeType;
  text += '\n'
  text += "Outbound Codec\n";
  text += outboundVideoCodec.mimeType + '\n' + outboundAudioCodec.mimeType;
  text += '\n'
  text += "Inbound Audio\n";
  text += 'bytesReceived:' + inboundRTPAudioStreamArray[0].bytesReceived + '\njitter:' + inboundRTPAudioStreamArray[0].jitter + '\nfractionLost:' + inboundRTPAudioStreamArray[0].fractionLost;
  text += '\n'
  text += "Inbound Video\n";
  text += 'bytesReceived:' + inboundRTPVideoStreamArray[0].bytesReceived + '\nfractionLost:' + inboundRTPVideoStreamArray[0].fractionLost;
  text += '\n'
  text += "Outbound Audio\n";
  text += 'bytesReceived:' + outboundRTPAudioStreamArray[0].bytesSent;
  text += '\n'
  text += "Outbound Video\n";
  text += 'bytesReceived:' + outboundRTPVideoStreamArray[0].bytesSent;
  text += '\n'
  text += "Local Audio/Vidoe Track\n";
  text += 'audioLevel:' + mediaStreamTrack_local_audioArray[0].audioLevel + '\nframeHeight:' + mediaStreamTrack_local_videoArray[0].frameHeight + '\nframeWidth:' + mediaStreamTrack_local_videoArray[0].frameWidth + '\nframesSent:' + mediaStreamTrack_local_videoArray[0].framesSent;
  text += '\n'
  text += "Remote Audio/Video Track\n";
  text += 'audioLevel:' + mediaStreamTrack_remote_audioArray[0].audioLevel + '\nframeHeight:' + mediaStreamTrack_remote_videoArray[0].frameHeight + '\nframeWidth:' + mediaStreamTrack_remote_videoArray[0].frameWidth;
  vm.skyway.stats = text;
  console.log(text);
}


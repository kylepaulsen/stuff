// This code was adapted from http://www.schmittmachine.com/dywapitchtrack.html
// Credit goes to Antoine Schmitt. Code is under the MIT license.

var waveletPitch = (function() {

    var DBL_MAX = Infinity;
    var fabs = Math.abs;
    var _iabs = function(x) {
        return ~~(Math.abs(x));
    };

    // returns 1 if power of 2
    function _power2p(value) {
        if (value === 1) return 0;
        return Number((value & (value - 1)) === 0);
    }

    var LG2 = Math.log(2);
    // count number of bits
    function _bitcount(value) {
        if (value === 0) return 1;
        return (~~(Math.log(value) / LG2)) + 1;
    }

    // closest power of 2 above or equal
    function _ceil_power2(value) {
        if (_power2p(value)) return value;
        if (value === 1) return 2;
        return 1 << _bitcount(value);
    }

    // closest power of 2 below or equal
    function _floor_power2(value) {
        if (_power2p(value)) return value;
        return _ceil_power2(value) >> 1;
    }

    // 2 power
    function _2power(i) {
        return 1 << i;
    }

    //******************************
    // the Wavelet algorithm itself
    //******************************

    var SAMP_RATE = 44100;
    function dywapitch_neededsamplecount(minFreq) {
        var nbSam = ~~(3 * SAMP_RATE / minFreq); // 1017. for 130 Hz
        nbSam = _ceil_power2(nbSam); // 1024
        return nbSam;
    }

    // Float32Array samples, int startsample, int samplecount
    function _dywapitch_computeWaveletPitch(samples, startsample, samplecount) {
        var pitchF = 0.0;

        var i, j;
        var si, si1;

        // must be a power of 2
        samplecount = _floor_power2(samplecount);

        var sam = new Float32Array(samplecount);
        var samView = new Float32Array(samples.buffer, startsample * 4);
        sam.set(samView);

        var curSamNb = samplecount;

        var distances = new Int32Array(samplecount);
        var mins = new Int32Array(samplecount);
        var maxs = new Int32Array(samplecount);
        var nbMins, nbMaxs;

        // algorithm parameters
        var maxFLWTlevels = 6;
        var maxF = 3000;
        var differenceLevelsN = 3;
        var maximaThresholdRatio = 0.75;

        var ampltitudeThreshold;
        var theDC = 0.0;

        (function() {
            // compute ampltitudeThreshold and theDC
            // first compute the DC and maxAMplitude
            var maxValue = -DBL_MAX;
            var minValue = DBL_MAX;
            for (i = 0; i < samplecount; i++) {
                si = sam[i];
                theDC = theDC + si;
                if (si > maxValue) maxValue = si;
                if (si < minValue) minValue = si;
            }
            theDC = theDC / samplecount;
            maxValue = maxValue - theDC;
            minValue = minValue - theDC;
            var amplitudeMax = (maxValue > -minValue ? maxValue : -minValue);

            ampltitudeThreshold = amplitudeMax * maximaThresholdRatio;
            //asLog("dywapitch theDC=%f ampltitudeThreshold=%f\n", theDC, ampltitudeThreshold);
        })();

        // levels, start without downsampling..
        var curLevel = 0;
        var curModeDistance = -1.;
        var delta;

        while (true) {
            // delta
            delta = ~~(SAMP_RATE / (_2power(curLevel) * maxF));
            //("dywapitch doing level=%ld delta=%ld\n", curLevel, delta);

            if (curSamNb < 2) break;

            // compute the first maximums and minumums after zero-crossing
            // store if greater than the min threshold
            // and if at a greater distance than delta
            var dv, previousDV = -1000;
            nbMins = nbMaxs = 0;
            var lastMinIndex = -1000000;
            var lastmaxIndex = -1000000;
            var findMax = 0;
            var findMin = 0;
            for (i = 1; i < curSamNb; i++) {
                si = sam[i] - theDC;
                si1 = sam[i - 1] - theDC;

                if (si1 <= 0 && si > 0) { findMax = 1; findMin = 0; }
                if (si1 >= 0 && si < 0) { findMin = 1; findMax = 0; }

                // min or max ?
                dv = si - si1;

                if (previousDV > -1000) {

                    if (findMin && previousDV < 0 && dv >= 0) {
                        // minimum
                        if (fabs(si1) >= ampltitudeThreshold) {
                            if (i - 1 > lastMinIndex + delta) {
                                mins[nbMins++] = i - 1;
                                lastMinIndex = i - 1;
                                findMin = 0;
                                //if DEBUGG then put "min ok"&&si
                                //
                            } else {
                                //if DEBUGG then put "min too close to previous"&&(i - lastMinIndex)
                                //
                            }
                        } else {
                            // if DEBUGG then put "min "&abs(si)&" < thresh = "&ampltitudeThreshold
                            //--
                        }
                    }

                    if (findMax && previousDV > 0 && dv <= 0) {
                        // maximum
                        if (fabs(si1) >= ampltitudeThreshold) {
                            if (i - 1 > lastmaxIndex + delta) {
                                maxs[nbMaxs++] = i - 1;
                                lastmaxIndex = i - 1;
                                findMax = 0;
                            } else {
                                //if DEBUGG then put "max too close to previous"&&(i - lastmaxIndex)
                                //--
                            }
                        } else {
                            //if DEBUGG then put "max "&abs(si)&" < thresh = "&ampltitudeThreshold
                            //--
                        }
                    }
                }

                previousDV = dv;
            }

            if (nbMins === 0 && nbMaxs === 0) {
                // no best distance !
                //asLog("dywapitch no mins nor maxs, exiting\n");

                // if DEBUGG then put "no mins nor maxs, exiting"
                break;
            }
            //if DEBUGG then put count(maxs)&&"maxs &"&&count(mins)&&"mins"

            // maxs = [5, 20, 100,...]
            // compute distances
            var d;
            distances.fill(0);
            for (i = 0; i < nbMins; i++) {
                for (j = 1; j < differenceLevelsN; j++) {
                    if (i + j < nbMins) {
                        d = _iabs(mins[i] - mins[i + j]);
                        //asLog("dywapitch i=%ld j=%ld d=%ld\n", i, j, d);
                        distances[d] = distances[d] + 1;
                    }
                }
            }
            for (i = 0; i < nbMaxs; i++) {
                for (j = 1; j < differenceLevelsN; j++) {
                    if (i + j < nbMaxs) {
                        d = _iabs(maxs[i] - maxs[i + j]);
                        //asLog("dywapitch i=%ld j=%ld d=%ld\n", i, j, d);
                        distances[d] = distances[d] + 1;
                    }
                }
            }

            // find best summed distance
            var bestDistance = -1;
            var bestValue = -1;
            for (i = 0; i < curSamNb; i++) {
                var summed = 0;
                for (j = -delta; j <= delta; j++) {
                    if (i + j >= 0 && i + j < curSamNb) {
                        summed += distances[i + j];
                    }
                }
                //asLog("dywapitch i=%ld summed=%ld bestDistance=%ld\n", i, summed, bestDistance);
                if (summed === bestValue) {
                    if (i === 2 * bestDistance) {
                        bestDistance = i;
                    }
                } else if (summed > bestValue) {
                    bestValue = summed;
                    bestDistance = i;
                }
            }
            //asLog("dywapitch bestDistance=%ld\n", bestDistance);

            // averaging
            var distAvg = 0.0;
            var nbDists = 0;
            for (j = -delta; j <= delta; j++) {
                if (bestDistance + j >= 0 && bestDistance + j < samplecount) {
                    var nbDist = distances[bestDistance + j];
                    if (nbDist > 0) {
                        nbDists += nbDist;
                        distAvg += (bestDistance + j) * nbDist;
                    }
                }
            }
            // this is our mode distance !
            if (nbDists !== 0) {
                distAvg /= nbDists;
            }
            //asLog("dywapitch distAvg=%f\n", distAvg);

            // continue the levels ?
            if (curModeDistance > 0) {
                var similarity = fabs(distAvg * 2 - curModeDistance);
                if (similarity <= 2 * delta) {
                    //if DEBUGG then put "similarity="&similarity&&"delta="&delta&&"ok"
                    //asLog("dywapitch similarity=%f OK !\n", similarity);
                    // two consecutive similar mode distances : ok !
                    pitchF = SAMP_RATE / (_2power(curLevel - 1) * curModeDistance);
                    break;
                }
                //if DEBUGG then put "similarity="&similarity&&"delta="&delta&&"not"
            }

            // not similar, continue next level
            curModeDistance = distAvg;

            curLevel = curLevel + 1;
            if (curLevel >= maxFLWTlevels) {
                // put "max levels reached, exiting"
                //asLog("dywapitch max levels reached, exiting\n");
                break;
            }

            // downsample
            if (curSamNb < 2) {
                //asLog("dywapitch not enough samples, exiting\n");
                break;
            }
            var halfCurSamNb = ~~(curSamNb / 2);
            for (i = 0; i < halfCurSamNb; i++) {
                sam[i] = (sam[2 * i] + sam[2 * i + 1]) / 2;
            }
            curSamNb = halfCurSamNb;
        }

        return pitchF;
    }

    // ***********************************
    // the dynamic postprocess
    // ***********************************

    /***
    It states:
     - a pitch cannot change much all of a sudden (20%) (impossible humanly,
     so if such a situation happens, consider that it is a mistake and drop it.
     - a pitch cannot double or be divided by 2 all of a sudden : it is an
     algorithm side-effect : divide it or double it by 2.
     - a lonely voiced pitch cannot happen, nor can a sudden drop in the middle
     of a voiced segment. Smooth the plot.
    ***/

    // pitchtracker: {double _prevPitch, int _pitchConfidence}
    function _dywapitch_dynamicprocess(pitchtracker, pitch) {

        // equivalence
        if (pitch === 0.0) pitch = -1.0;

        var estimatedPitch = -1;
        var acceptedError = 0.2;
        var maxConfidence = 10;

        if (pitch !== -1) {
            // I have a pitch here

            if (pitchtracker._prevPitch === -1) {
                // no previous
                estimatedPitch = pitch;
                pitchtracker._prevPitch = pitch;
                pitchtracker._pitchConfidence = 1;
            } else if (Math.abs(pitchtracker._prevPitch - pitch) / pitch < acceptedError) {
                // similar : remember and increment pitch
                pitchtracker._prevPitch = pitch;
                estimatedPitch = pitch;
                pitchtracker._pitchConfidence = Math.min(maxConfidence, pitchtracker._pitchConfidence + 1); // maximum 3
            } else if ((pitchtracker._pitchConfidence >= maxConfidence - 2) && Math.abs(pitchtracker._prevPitch - 2 * pitch) / (2 * pitch) < acceptedError) {
                // close to half the last pitch, which is trusted
                estimatedPitch = 2 * pitch;
                pitchtracker._prevPitch = estimatedPitch;
            } else if ((pitchtracker._pitchConfidence >= maxConfidence - 2) && Math.abs(pitchtracker._prevPitch - 0.5 * pitch) / (0.5 * pitch) < acceptedError) {
                // close to twice the last pitch, which is trusted
                estimatedPitch = 0.5 * pitch;
                pitchtracker._prevPitch = estimatedPitch;
            } else {
                // nothing like this : very different value
                if (pitchtracker._pitchConfidence >= 1) {
                    // previous trusted : keep previous
                    estimatedPitch = pitchtracker._prevPitch;
                    pitchtracker._pitchConfidence = Math.max(0, pitchtracker._pitchConfidence - 1);
                } else {
                    // previous not trusted : take current
                    estimatedPitch = pitch;
                    pitchtracker._prevPitch = pitch;
                    pitchtracker._pitchConfidence = 1;
                }
            }
        } else {
            // no pitch now
            if (pitchtracker._prevPitch !== -1) {
                // was pitch before
                if (pitchtracker._pitchConfidence >= 1) {
                    // continue previous
                    estimatedPitch = pitchtracker._prevPitch;
                    pitchtracker._pitchConfidence = Math.max(0, pitchtracker._pitchConfidence - 1);
                } else {
                    pitchtracker._prevPitch = -1;
                    estimatedPitch = -1.;
                    pitchtracker._pitchConfidence = 0;
                }
            }
        }

        // put "_pitchConfidence="&pitchtracker._pitchConfidence
        if (pitchtracker._pitchConfidence >= 1) {
            // ok
            pitch = estimatedPitch;
        } else {
            pitch = -1;
        }

        // equivalence
        if (pitch === -1) pitch = 0.0;

        return pitch;
    }

    // ************************************
    // the API main entry points
    // ************************************

    // pitchtracker: {double _prevPitch, int _pitchConfidence}
    function dywapitch_inittracking(pitchtracker) {
        pitchtracker._prevPitch = -1;
        pitchtracker._pitchConfidence = -1;
    }

    // pitchtracker: {double _prevPitch, int _pitchConfidence}, Float32Array samples, int startsample, int samplecount
    function dywapitch_computepitch(pitchtracker, samples, startsample, samplecount) {
        var raw_pitch = _dywapitch_computeWaveletPitch(samples, startsample, samplecount);
        return _dywapitch_dynamicprocess(pitchtracker, raw_pitch);
    }

    var pitchtracker = {
        _prevPitch: -1,
        _pitchConfidence: -1
    };

    function js_inittracking() {
        dywapitch_inittracking(pitchtracker);
    }
    js_inittracking();

    // Float32Array samples, int startsample, int samplecount
    function js_computepitch(samples, startsample, samplecount) {
        return dywapitch_computepitch(pitchtracker, samples, startsample, samplecount);
    }

    function js_setsamplerate(samplerate) {
        SAMP_RATE = samplerate;
    }

    function js_getconfidence() {
        return pitchtracker._pitchConfidence;
    }

    return {
        neededSampleCount: dywapitch_neededsamplecount,
        initTracking: js_inittracking,
        computePitch: js_computepitch,
        setSampleRate: js_setsamplerate,
        getConfidence: js_getconfidence
    };
})();

(function(global) {
    'use strict';

    /*
    This file heavily uses the code from:
    https://github.com/THEjoezack/ColorMine

    Used this page to test:
    http://colormine.org/delta-e-calculator/cie2000
    */

    global.app = global.app || {};
    const app = global.app;

    app.colorComparer = function() {
        const rgbToXyz = function(r, g, b) {
            const pivotRGB = function(val) {
                if (val > 0.04045) {
                    return Math.pow((val + 0.055) / 1.055, 2.4) * 100;
                } else {
                    return 100 * val / 12.92;
                }
            };

            r = pivotRGB(r / 255);
            g = pivotRGB(g / 255);
            b = pivotRGB(b / 255);

            return {
                x: r * 0.4124 + g * 0.3576 + b * 0.1805,
                y: r * 0.2126 + g * 0.7152 + b * 0.0722,
                z: r * 0.0193 + g * 0.1192 + b * 0.9505
            };
        };

        const xyzToLab = function(x, y, z) {
            const whiteRef = {
                x: 95.047,
                y: 100,
                z: 108.883
            };
            const epsilon = 0.008856;
            const kappa = 903.3;

            const pivotXyz = function(val) {
                if (val > epsilon) {
                    return Math.pow(val, 1 / 3);
                } else {
                    return (kappa * val + 16) / 116;
                }
            };

            x = pivotXyz(x / whiteRef.x);
            y = pivotXyz(y / whiteRef.y);
            z = pivotXyz(z / whiteRef.z);

            return {
                l: Math.max(0, 116 * y - 16),
                a: 500 * (x - y),
                b: 200 * (y - z)
            };
        };

        const rgbToLab = function(r, g, b) {
            const xyz = rgbToXyz(r, g, b);
            return xyzToLab(xyz.x, xyz.y, xyz.z);
        };

        const radToDeg = 180 / Math.PI;
        const degToRad = 1 / radToDeg;

        // CieDe2000
        const colorDiff = function(r1, g1, b1, r2, g2, b2) {
            // weights
            const k_L = 1;
            const k_C = 1;
            const k_H = 1;

            const lab1 = rgbToLab(r1, g1, b1);
            const lab2 = rgbToLab(r2, g2, b2);

            const c_star_1_ab = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
            const c_star_2_ab = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
            const c_star_average_ab = (c_star_1_ab + c_star_2_ab) / 2;

            let c_star_average_ab_pot7 = c_star_average_ab * c_star_average_ab * c_star_average_ab;
            c_star_average_ab_pot7 *= c_star_average_ab_pot7 * c_star_average_ab;

            const G = 0.5 * (1 - Math.sqrt(c_star_average_ab_pot7 / (c_star_average_ab_pot7 + 6103515625)));
            const a1_prime = (1 + G) * lab1.a;
            const a2_prime = (1 + G) * lab2.a;

            const C_prime_1 = Math.sqrt(a1_prime * a1_prime + lab1.b * lab1.b);
            const C_prime_2 = Math.sqrt(a2_prime * a2_prime + lab2.b * lab2.b);
            //Angles in Degree.
            const h_prime_1 = ((Math.atan2(lab1.b, a1_prime) * radToDeg) + 360) % 360;
            const h_prime_2 = ((Math.atan2(lab2.b, a2_prime) * radToDeg) + 360) % 360;

            const delta_L_prime = lab2.l - lab1.l;
            const delta_C_prime = C_prime_2 - C_prime_1;

            const h_bar = Math.abs(h_prime_1 - h_prime_2);
            let delta_h_prime;
            if (C_prime_1 * C_prime_2 === 0) {
                delta_h_prime = 0;
            } else {
                if (h_bar <= 180) {
                    delta_h_prime = h_prime_2 - h_prime_1;
                } else if (h_bar > 180 && h_prime_2 <= h_prime_1) {
                    delta_h_prime = h_prime_2 - h_prime_1 + 360;
                } else {
                    delta_h_prime = h_prime_2 - h_prime_1 - 360;
                }
            }
            const delta_H_prime = 2 * Math.sqrt(C_prime_1 * C_prime_2) * Math.sin(delta_h_prime * Math.PI / 360);

            // Calculate CIEDE2000
            const L_prime_average = (lab1.l + lab2.l) / 2;
            const C_prime_average = (C_prime_1 + C_prime_2) / 2;

            //Calculate h_prime_average
            let h_prime_average;
            if (C_prime_1 * C_prime_2 === 0) {
                h_prime_average = 0;
            } else {
                if (h_bar <= 180) {
                    h_prime_average = (h_prime_1 + h_prime_2) / 2;
                } else if (h_bar > 180 && (h_prime_1 + h_prime_2) < 360) {
                    h_prime_average = (h_prime_1 + h_prime_2 + 360) / 2;
                } else {
                    h_prime_average = (h_prime_1 + h_prime_2 - 360) / 2;
                }
            }

            let L_prime_average_minus_50_square = (L_prime_average - 50);
            L_prime_average_minus_50_square *= L_prime_average_minus_50_square;

            const S_L = 1 + ((0.015 * L_prime_average_minus_50_square) /
                Math.sqrt(20 + L_prime_average_minus_50_square));
            const S_C = 1 + 0.045 * C_prime_average;
            const T = 1 -
                0.17 * Math.cos(degToRad * (h_prime_average - 30)) +
                0.24 * Math.cos(degToRad * (h_prime_average * 2)) +
                0.32 * Math.cos(degToRad * (h_prime_average * 3 + 6)) -
                0.2 * Math.cos(degToRad * (h_prime_average * 4 - 63));
            const S_H = 1 + 0.015 * T * C_prime_average;
            let h_prime_average_minus_275_div_25_square = (h_prime_average - 275) / 25;
            h_prime_average_minus_275_div_25_square *= h_prime_average_minus_275_div_25_square;
            const delta_theta = 30 * Math.exp(-h_prime_average_minus_275_div_25_square);

            let C_prime_average_pot_7 = C_prime_average * C_prime_average * C_prime_average;
            C_prime_average_pot_7 *= C_prime_average_pot_7 * C_prime_average;
            const R_C = 2 * Math.sqrt(C_prime_average_pot_7 / (C_prime_average_pot_7 + 6103515625));

            const R_T = -Math.sin(degToRad * (2 * delta_theta)) * R_C;

            const delta_L_prime_div_k_L_S_L = delta_L_prime / (S_L * k_L);
            const delta_C_prime_div_k_C_S_C = delta_C_prime / (S_C * k_C);
            const delta_H_prime_div_k_H_S_H = delta_H_prime / (S_H * k_H);

            // CIEDE2000
            return Math.sqrt(
                delta_L_prime_div_k_L_S_L * delta_L_prime_div_k_L_S_L +
                delta_C_prime_div_k_C_S_C * delta_C_prime_div_k_C_S_C +
                delta_H_prime_div_k_H_S_H * delta_H_prime_div_k_H_S_H +
                R_T * delta_C_prime_div_k_C_S_C * delta_H_prime_div_k_H_S_H
            );
        };

        return {
            compareColors: colorDiff
        };
    };
})(this);

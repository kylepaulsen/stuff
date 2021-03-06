uniform vec2 size;
uniform float time;

void main(void) {
    vec4 pos = gl_FragCoord;
    vec2 graph = (2.*pos.xy / size - 1.);
    vec2 initPoint = vec2(-1.0, 0.25);
    initPoint.x = 0.2*cos(time / 5.)-0.6;
    initPoint.y = 0.6*sin(time / 2.5)-0.0;

    float cutOff = 4.;
    float magnitude;
    float iterations = 0.;
    float mag;
    for(float iters = 0.; iters < 50.; iters += 1.) {
        magnitude = dot(graph, graph);
        float xTemp = graph.x * graph.x - graph.y * graph.y + initPoint.x;
        graph.y = 2. * graph.x * graph.y + initPoint.y;
        graph.x = xTemp;
        if(iterations == 0. && magnitude > cutOff) {
            iterations = iters;
            mag = magnitude;
        }
    }

    if (iterations == 0.) {
        gl_FragColor = vec4(0., 0., 0., 1.);
    } else {
        float red = sin(time/10.)*iterations/10.;
        float blue = sin(iterations*time);//, 5.) / 5.;
        float green = cos(time/10.)*iterations/10.;
        gl_FragColor = vec4(red, green, blue, 1.);
    }
}
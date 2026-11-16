package com.pipeflow.physics;

public class FrictionFactorSolver {

    private static final int MAX_ITER = 100;
    private static final double TOLERANCE = 1e-10;

    private FrictionFactorSolver() {}








    public static double solve(double reynoldsNumber, double relativeRoughness) {
        if (reynoldsNumber <= 0) return 0.0;
        if (relativeRoughness < 0) relativeRoughness = 0;








        if (reynoldsNumber < 2300) {
            return 64.0 / reynoldsNumber;
        } else if (reynoldsNumber < 4000) {
            double fLam = 64.0 / 2300.0;
            double fTurb = solveTurbulent(4000.0, relativeRoughness);
            double t = (reynoldsNumber - 2300.0) / 1700.0;
            return fLam + t * (fTurb - fLam);
        } else {
            return solveTurbulent(reynoldsNumber, relativeRoughness);
        }
    }

    private static double solveTurbulent(double re, double relRoughness) {
        double arg0 = relRoughness / 3.7 + 5.74 / Math.pow(re, 0.9);
        if (arg0 <= 0) arg0 = 1e-10;
        double x = -2.0 * Math.log10(arg0);

        for (int i = 0; i < MAX_ITER; i++) {
            if (x <= 0) x = 0.1;
            double arg = relRoughness / 3.7 + 2.51 / (re * x);
            if (arg <= 0) arg = 1e-20;
            double xNew = -2.0 * Math.log10(arg);
            if (Math.abs(xNew - x) < TOLERANCE) {
                x = xNew;
                break;
            }
            x = xNew;
        }



        return (x > 0) ? 1.0 / (x * x) : 0.02;
    }
}

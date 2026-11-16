package com.pipeflow.physics;

import java.util.Map;

public class MinorLossConstants {

    private MinorLossConstants() {}

    private static final Map<Integer, Double> ELBOW_K = Map.of(
        45,  0.35,
        90,  0.90,
        135, 1.50,
        180, 2.20
    );









    public static final double K_ENTRANCE = 0.50;
    public static final double K_EXIT     = 1.00;
    public static final double K_TEE      = 1.00;

    public static double getElbowK(int angleDeg) {
        return ELBOW_K.getOrDefault(nearestAngle(angleDeg), 0.90);
    }

    private static int nearestAngle(int angle) {
        int[] known = {45, 90, 135, 180};
        int nearest = known[0];
        for (int k : known) {
            if (Math.abs(k - angle) < Math.abs(nearest - angle)) nearest = k;
        }
        return nearest;
    }
}

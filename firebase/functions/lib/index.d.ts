export declare const processReport: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    reportId: string;
    friendlyResponse: string;
    summary: string;
    category: "road" | "waste_management" | "water" | "electricity" | "sewage" | "street_light" | "encroachment" | "other";
    location: string;
    severity: "low" | "medium" | "high";
    decision: "PROCEED" | "BLOCK";
    action: {
        type: "email" | "letter" | "recommendation";
        content: string;
    };
}>, unknown>;
export declare const onNewReport: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").DocumentSnapshot> | undefined, {
    reportId: string;
}>>;

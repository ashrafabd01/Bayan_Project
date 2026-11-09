import { useEffect } from "react";
import { useUser } from "../../hooks/useUser";
import { useRouter } from "expo-router";
import Themedloader from "../ThemedLoader";

const UserOnly = ({ children }) => {
    const { user, isLoading } = useUser(); // استخدام isLoading المتناسق مع الـ Context
    const router = useRouter();

    useEffect(() => {
        // إذا انتهى الفحص (isLoading = false) وتبين أن المستخدم غير مسجل (null)
        if (!isLoading && user === null) {
            router.replace('/login'); // توجيهه لصفحة التسجيل أو الدخول
        }
    }, [user, isLoading]);

    // طالما أن التطبيق يتحقق من الـ Token، اعرض شاشة التحميل
    if (isLoading) {
        return <Themedloader />;
    }

    // إذا تم التحقق والمستخدم مسجل بالفعل، اعرض له الصفحة المحمية
    return user ? children : null;
};

export default UserOnly;
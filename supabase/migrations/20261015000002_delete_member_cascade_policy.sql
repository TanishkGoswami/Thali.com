-- ==============================================================================
-- Thali.com — Migration: Allow Member Deletion & Cascading Clean-up
-- Enables Delete policy on meal_transactions and provides admin_delete_member RPC
-- ==============================================================================

-- 1. Ensure DELETE policy is enabled on meal_transactions so admins/system can remove transactions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'meal_transactions' AND policyname = 'Allow delete meal transactions'
    ) THEN
        CREATE POLICY "Allow delete meal transactions"
        ON public.meal_transactions FOR DELETE USING (TRUE);
    END IF;
END $$;

-- 2. Stored Procedure for Cascading Member Deletion (Clean removal of past traces)
CREATE OR REPLACE FUNCTION public.admin_delete_member(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove linked ledger entries
    DELETE FROM public.meal_transactions WHERE member_id = p_member_id;
    
    -- Remove payments
    DELETE FROM public.payments WHERE member_id = p_member_id;
    
    -- Remove subscriptions
    DELETE FROM public.subscriptions WHERE member_id = p_member_id;
    
    -- Remove member profile
    DELETE FROM public.profiles WHERE id = p_member_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Member and all associated subscriptions and meal transactions permanently deleted.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

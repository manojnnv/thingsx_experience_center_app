import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { siteConfig } from '@/config/site';

interface OrgDetailsState {
    siteId: string;
    orgId: string;
}

const initialState: OrgDetailsState = {
    siteId: siteConfig.siteId,
    orgId: siteConfig.orgId,
};

export const orgDetailsSlice = createSlice({
    name: 'orgDetails',
    initialState,
    reducers: {
        setSiteId: (state, action: PayloadAction<string>) => {
            state.siteId = action.payload;
        },
        setOrgId: (state, action: PayloadAction<string>) => {
            state.orgId = action.payload;
        },
    },
});

export const { setSiteId, setOrgId } = orgDetailsSlice.actions;

export default orgDetailsSlice.reducer;

import { Show } from 'solid-js';
import { css } from 'solid-styled-components';
import { cacheNoArgs } from '@/providers/decorators';

const containerStyle = cacheNoArgs(
  () => css`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    padding-right: 12px;
    height: 100%;
  `,
);

const macBtnStyle = (color: string) => css`
  -webkit-app-region: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: ${color};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  
  &:hover {
    filter: brightness(1.2);
    transform: scale(1.1);
  }
  
  &:active {
    filter: brightness(0.8);
    transform: scale(0.9);
  }
`;

export type WindowControllerProps = {
  isMaximize?: boolean;
  onToggleMaximize?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
};

export const WindowController = (props: WindowControllerProps) => {
  return (
    <div class={containerStyle()}>
      <button class={macBtnStyle('#ff5f56')} onClick={props.onClose} title="Close" aria-label="Close" />
      <button class={macBtnStyle('#ffbd2e')} onClick={props.onMinimize} title="Minimize" aria-label="Minimize" />
      <button class={macBtnStyle('#27c93f')} onClick={props.onToggleMaximize} title="Maximize" aria-label="Maximize" />
    </div>
  );
};
